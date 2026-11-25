import { and, asc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { professionals } from "@/db/schema";
import { assertTenantOwnership } from "@/lib/tenant/context";
import { getOrganizationPlanUsage } from "@/lib/plans/limits";
import { logAudit } from "@/lib/security/audit";
import type { ProfessionalInput } from "./schemas";

export async function listProfessionals(organizationId: string) {
  const db = getDb();
  return db
    .select()
    .from(professionals)
    .where(
      and(
        eq(professionals.organizationId, organizationId),
        isNull(professionals.deletedAt)
      )
    )
    .orderBy(asc(professionals.name));
}

export async function createProfessional(params: {
  organizationId: string;
  actorUserId: string;
  input: ProfessionalInput;
}) {
  const db = getDb();
  const { organizationId, actorUserId, input } = params;

  if (input.status === "active") {
    const usage = await getOrganizationPlanUsage(organizationId);
    if (!usage.canAddProfessional) {
      throw new Error(
        `Limite do plano ${usage.planName} atingido (${usage.activeProfessionals}/${usage.maxProfessionals} profissionais ativos). Faça upgrade do plano para cadastrar mais profissionais.`
      );
    }
  }

  const [created] = await db
    .insert(professionals)
    .values({
      organizationId,
      name: input.name,
      phone: input.phone || null,
      email: input.email ? input.email.toLowerCase() : null,
      cpf: input.cpf || null,
      roleTitle: input.roleTitle || null,
      specialty: input.specialty || null,
      hiredAt: input.hiredAt || null,
      status: input.status,
      defaultCommissionBps: Math.round(input.defaultCommissionPercent * 100),
      salaryCents: Math.round(input.salaryReais * 100),
      remunerationType: input.remunerationType,
      color: input.color,
    })
    .returning();

  await logAudit({
    organizationId,
    actorUserId,
    action: "professional.created",
    resourceType: "professional",
    resourceId: created?.id ?? null,
    metadata: { status: input.status, specialty: input.specialty || null },
  });

  return created!;
}

export async function updateProfessional(params: {
  organizationId: string;
  actorUserId: string;
  professionalId: string;
  input: ProfessionalInput;
}) {
  const db = getDb();
  const { organizationId, actorUserId, professionalId, input } = params;

  const [existing] = await db
    .select({
      id: professionals.id,
      organizationId: professionals.organizationId,
      status: professionals.status,
    })
    .from(professionals)
    .where(
      and(eq(professionals.id, professionalId), isNull(professionals.deletedAt))
    )
    .limit(1);

  assertTenantOwnership(existing?.organizationId, organizationId);

  // Enforce plan seat limit when reactivating a previously inactive professional
  if (existing!.status !== "active" && input.status === "active") {
    const usage = await getOrganizationPlanUsage(organizationId);
    if (!usage.canAddProfessional) {
      throw new Error(
        `Limite do plano ${usage.planName} atingido (${usage.activeProfessionals}/${usage.maxProfessionals} profissionais ativos).`
      );
    }
  }

  const [updated] = await db
    .update(professionals)
    .set({
      name: input.name,
      phone: input.phone || null,
      email: input.email ? input.email.toLowerCase() : null,
      cpf: input.cpf || null,
      roleTitle: input.roleTitle || null,
      specialty: input.specialty || null,
      hiredAt: input.hiredAt || null,
      status: input.status,
      defaultCommissionBps: Math.round(input.defaultCommissionPercent * 100),
      salaryCents: Math.round(input.salaryReais * 100),
      remunerationType: input.remunerationType,
      color: input.color,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(professionals.id, professionalId),
        eq(professionals.organizationId, organizationId)
      )
    )
    .returning();

  await logAudit({
    organizationId,
    actorUserId,
    action: "professional.updated",
    resourceType: "professional",
    resourceId: professionalId,
    metadata: { status: input.status },
  });

  return updated!;
}

export async function deleteProfessional(params: {
  organizationId: string;
  actorUserId: string;
  professionalId: string;
}) {
  const db = getDb();
  const { organizationId, actorUserId, professionalId } = params;

  const [existing] = await db
    .select({
      id: professionals.id,
      organizationId: professionals.organizationId,
    })
    .from(professionals)
    .where(
      and(eq(professionals.id, professionalId), isNull(professionals.deletedAt))
    )
    .limit(1);

  assertTenantOwnership(existing?.organizationId, organizationId);

  await db
    .update(professionals)
    .set({
      status: "inactive",
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(professionals.id, professionalId),
        eq(professionals.organizationId, organizationId)
      )
    );

  await logAudit({
    organizationId,
    actorUserId,
    action: "professional.deleted",
    resourceType: "professional",
    resourceId: professionalId,
  });
}

