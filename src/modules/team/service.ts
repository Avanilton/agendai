import { and, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import {
  commissions,
  professionalGoals,
  professionals,
  teamTimeEntries,
} from "@/db/schema";
import { assertTenantOwnership } from "@/lib/tenant/context";
import { logAudit } from "@/lib/security/audit";
import { createFinancialTransaction } from "@/modules/financial/service";
import { calculateCommissionCents } from "./calculations";
import type {
  CreateCommissionInput,
  CreateGoalInput,
  CreateTimeEntryInput,
} from "./schemas";

export async function getTeamWorkspaceData(organizationId: string) {
  const db = getDb();

  const [commissionRows, timeRows, goalRows] = await Promise.all([
    db
      .select({
        id: commissions.id,
        professionalId: commissions.professionalId,
        professionalName: professionals.name,
        source: commissions.source,
        calcType: commissions.calcType,
        baseAmountCents: commissions.baseAmountCents,
        rateBps: commissions.rateBps,
        commissionAmountCents: commissions.commissionAmountCents,
        status: commissions.status,
        referenceDate: commissions.referenceDate,
        paidAt: commissions.paidAt,
        description: commissions.description,
      })
      .from(commissions)
      .innerJoin(professionals, eq(commissions.professionalId, professionals.id))
      .where(eq(commissions.organizationId, organizationId))
      .orderBy(desc(commissions.referenceDate), desc(commissions.createdAt))
      .limit(200),
    db
      .select({
        id: teamTimeEntries.id,
        professionalId: teamTimeEntries.professionalId,
        professionalName: professionals.name,
        type: teamTimeEntries.type,
        entryDate: teamTimeEntries.entryDate,
        durationMinutes: teamTimeEntries.durationMinutes,
        notes: teamTimeEntries.notes,
      })
      .from(teamTimeEntries)
      .innerJoin(
        professionals,
        eq(teamTimeEntries.professionalId, professionals.id)
      )
      .where(eq(teamTimeEntries.organizationId, organizationId))
      .orderBy(desc(teamTimeEntries.entryDate), desc(teamTimeEntries.createdAt))
      .limit(200),
    db
      .select({
        id: professionalGoals.id,
        professionalId: professionalGoals.professionalId,
        professionalName: professionals.name,
        monthKey: professionalGoals.monthKey,
        targetRevenueCents: professionalGoals.targetRevenueCents,
        targetAppointments: professionalGoals.targetAppointments,
        bonusCents: professionalGoals.bonusCents,
      })
      .from(professionalGoals)
      .innerJoin(
        professionals,
        eq(professionalGoals.professionalId, professionals.id)
      )
      .where(eq(professionalGoals.organizationId, organizationId))
      .orderBy(desc(professionalGoals.monthKey)),
  ]);

  return {
    commissions: commissionRows.map((c) => ({
      ...c,
      paidAtIso: c.paidAt ? c.paidAt.toISOString() : null,
    })),
    timeEntries: timeRows,
    goals: goalRows,
  };
}

async function assertProfessionalBelongsToTenant(
  organizationId: string,
  professionalId: string
) {
  const db = getDb();
  const [prof] = await db
    .select({
      id: professionals.id,
      organizationId: professionals.organizationId,
      name: professionals.name,
    })
    .from(professionals)
    .where(
      and(eq(professionals.id, professionalId), isNull(professionals.deletedAt))
    )
    .limit(1);
  assertTenantOwnership(prof?.organizationId, organizationId);
  return prof!;
}

export async function createCommissionEntry(params: {
  organizationId: string;
  actorUserId: string;
  input: CreateCommissionInput;
}) {
  const db = getDb();
  const { organizationId, actorUserId, input } = params;

  await assertProfessionalBelongsToTenant(organizationId, input.professionalId);

  const baseAmountCents = Math.round(input.baseAmountReais * 100);
  const rateBps = Math.round(input.ratePercent * 100);
  const fixedAmountCents = Math.round(input.fixedAmountReais * 100);

  const commissionAmountCents = calculateCommissionCents({
    calcType: input.calcType,
    baseAmountCents,
    rateBps,
    fixedAmountCents,
  });

  if (commissionAmountCents <= 0) {
    throw new Error("O valor calculado da comissão deve ser maior que zero.");
  }

  const [created] = await db
    .insert(commissions)
    .values({
      organizationId,
      professionalId: input.professionalId,
      source: input.source,
      calcType: input.calcType,
      baseAmountCents,
      rateBps,
      commissionAmountCents,
      status: "pending",
      referenceDate: input.referenceDate,
      description: input.description,
      createdByUserId: actorUserId,
    })
    .returning();

  await logAudit({
    organizationId,
    actorUserId,
    action: "commission.created",
    resourceType: "commission",
    resourceId: created!.id,
    metadata: { source: input.source, commissionAmountCents },
  });

  return created!;
}

export async function payCommissionAndLogExpense(params: {
  organizationId: string;
  actorUserId: string;
  commissionId: string;
  accountId: string;
  paymentMethod: "pix" | "cash" | "credit_card" | "debit_card" | "bank_transfer" | "other";
}) {
  const db = getDb();
  const { organizationId, actorUserId, commissionId, accountId, paymentMethod } =
    params;

  const [row] = await db
    .select({
      id: commissions.id,
      organizationId: commissions.organizationId,
      status: commissions.status,
      commissionAmountCents: commissions.commissionAmountCents,
      description: commissions.description,
      professionalName: professionals.name,
    })
    .from(commissions)
    .innerJoin(professionals, eq(commissions.professionalId, professionals.id))
    .where(eq(commissions.id, commissionId))
    .limit(1);

  assertTenantOwnership(row?.organizationId, organizationId);

  if (row!.status !== "pending") {
    throw new Error("Somente comissões pendentes podem ser pagas.");
  }

  await createFinancialTransaction({
    organizationId,
    actorUserId,
    input: {
      type: "expense",
      description: `Comissão — ${row!.professionalName}: ${row!.description}`,
      amountReais: row!.commissionAmountCents / 100,
      discountReais: 0,
      interestReais: 0,
      fineReais: 0,
      paymentMethod,
      dueDate: new Date().toISOString().slice(0, 10),
      markAsPaid: true,
      accountId,
      destinationAccountId: "",
      categoryId: "",
      costCenterId: "",
      clientId: "",
      supplierId: "",
      installments: 1,
      isRecurring: false,
      notes: "",
    },
  });

  await db
    .update(commissions)
    .set({ status: "paid", paidAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(commissions.id, commissionId),
        eq(commissions.organizationId, organizationId)
      )
    );

  await logAudit({
    organizationId,
    actorUserId,
    action: "commission.paid",
    resourceType: "commission",
    resourceId: commissionId,
    metadata: { paymentMethod },
  });
}

export async function createTimeEntry(params: {
  organizationId: string;
  actorUserId: string;
  input: CreateTimeEntryInput;
}) {
  const db = getDb();
  const { organizationId, actorUserId, input } = params;

  await assertProfessionalBelongsToTenant(organizationId, input.professionalId);

  const durationMinutes =
    input.type === "work_hours" || input.type === "overtime"
      ? Math.round(input.hours * 60)
      : 0;

  const [created] = await db
    .insert(teamTimeEntries)
    .values({
      organizationId,
      professionalId: input.professionalId,
      type: input.type,
      entryDate: input.entryDate,
      durationMinutes,
      notes: input.notes || null,
      createdByUserId: actorUserId,
    })
    .returning();

  return created!;
}

export async function createProfessionalGoal(params: {
  organizationId: string;
  input: CreateGoalInput;
}) {
  const db = getDb();
  const { organizationId, input } = params;

  await assertProfessionalBelongsToTenant(organizationId, input.professionalId);

  const [created] = await db
    .insert(professionalGoals)
    .values({
      organizationId,
      professionalId: input.professionalId,
      monthKey: input.monthKey,
      targetRevenueCents: Math.round(input.targetRevenueReais * 100),
      targetAppointments: input.targetAppointments,
      bonusCents: Math.round(input.bonusReais * 100),
    })
    .returning();

  return created!;
}

