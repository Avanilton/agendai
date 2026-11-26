import { and, count, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import {
  auditLogs,
  clients,
  fiscalProfiles,
  organizations,
  pixCharges,
  plans,
  serviceInvoices,
  subscriptions,
  users,
} from "@/db/schema";
import { assertTenantOwnership } from "@/lib/tenant/context";
import { logAudit } from "@/lib/security/audit";
import { generatePixBrCode } from "./pix";

export async function getIntegrationsWorkspaceData(organizationId: string) {
  const db = getDb();

  const [charges, profileRows, invoices] = await Promise.all([
    db
      .select({
        id: pixCharges.id,
        clientName: clients.name,
        clientPhone: clients.whatsapp,
        pixKey: pixCharges.pixKey,
        amountCents: pixCharges.amountCents,
        brCode: pixCharges.brCode,
        description: pixCharges.description,
        status: pixCharges.status,
        createdAt: pixCharges.createdAt,
      })
      .from(pixCharges)
      .leftJoin(clients, eq(pixCharges.clientId, clients.id))
      .where(eq(pixCharges.organizationId, organizationId))
      .orderBy(desc(pixCharges.createdAt))
      .limit(100),
    db
      .select()
      .from(fiscalProfiles)
      .where(eq(fiscalProfiles.organizationId, organizationId))
      .limit(1),
    db
      .select({
        id: serviceInvoices.id,
        clientName: clients.name,
        serviceCode: serviceInvoices.serviceCode,
        description: serviceInvoices.description,
        amountCents: serviceInvoices.amountCents,
        issRateBps: serviceInvoices.issRateBps,
        status: serviceInvoices.status,
        invoiceNumber: serviceInvoices.invoiceNumber,
        createdAt: serviceInvoices.createdAt,
      })
      .from(serviceInvoices)
      .leftJoin(clients, eq(serviceInvoices.clientId, clients.id))
      .where(eq(serviceInvoices.organizationId, organizationId))
      .orderBy(desc(serviceInvoices.createdAt))
      .limit(100),
  ]);

  return {
    pixCharges: charges.map((c) => ({
      ...c,
      createdAtIso: c.createdAt.toISOString(),
    })),
    fiscalProfile: profileRows[0] ?? null,
    invoices: invoices.map((i) => ({
      ...i,
      createdAtIso: i.createdAt.toISOString(),
    })),
  };
}

export async function createPixCharge(params: {
  organizationId: string;
  organizationName: string;
  actorUserId: string;
  clientId?: string;
  pixKey: string;
  amountReais: number;
  description: string;
}) {
  const db = getDb();
  const amountCents = Math.round(params.amountReais * 100);
  const txId = `AGD${Date.now().toString().slice(-10)}`;

  const brCode = generatePixBrCode({
    pixKey: params.pixKey,
    merchantName: params.organizationName,
    amountCents,
    txId,
  });

  const [created] = await db
    .insert(pixCharges)
    .values({
      organizationId: params.organizationId,
      clientId: params.clientId || null,
      provider: "manual_br_code",
      pixKey: params.pixKey,
      amountCents,
      brCode,
      description: params.description,
      status: "pending",
      createdByUserId: params.actorUserId,
    })
    .returning();

  await logAudit({
    organizationId: params.organizationId,
    actorUserId: params.actorUserId,
    action: "pix.charge_created",
    resourceType: "pix_charge",
    resourceId: created!.id,
    metadata: { amountCents },
  });

  return created!;
}

export async function markPixChargePaid(params: {
  organizationId: string;
  actorUserId: string;
  chargeId: string;
}) {
  const db = getDb();
  const [existing] = await db
    .select({ id: pixCharges.id, organizationId: pixCharges.organizationId })
    .from(pixCharges)
    .where(eq(pixCharges.id, params.chargeId))
    .limit(1);
  assertTenantOwnership(existing?.organizationId, params.organizationId);

  await db
    .update(pixCharges)
    .set({ status: "paid", paidAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(pixCharges.id, params.chargeId),
        eq(pixCharges.organizationId, params.organizationId)
      )
    );

  await logAudit({
    organizationId: params.organizationId,
    actorUserId: params.actorUserId,
    action: "pix.charge_paid",
    resourceType: "pix_charge",
    resourceId: params.chargeId,
  });
}

export async function getGlobalAdminOverview() {
  const db = getDb();

  const [orgCount, userCount, auditCount, orgList, planList] = await Promise.all([
    db.select({ total: count() }).from(organizations).where(isNull(organizations.deletedAt)),
    db.select({ total: count() }).from(users).where(isNull(users.deletedAt)),
    db.select({ total: count() }).from(auditLogs),
    db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        segment: organizations.segment,
        status: organizations.status,
        createdAt: organizations.createdAt,
        planId: plans.id,
        planName: plans.name,
      })
      .from(organizations)
      .leftJoin(subscriptions, eq(subscriptions.organizationId, organizations.id))
      .leftJoin(plans, eq(subscriptions.planId, plans.id))
      .where(isNull(organizations.deletedAt))
      .orderBy(desc(organizations.createdAt))
      .limit(100),
    db.select().from(plans),
  ]);

  return {
    metrics: {
      organizations: Number(orgCount[0]?.total ?? 0),
      users: Number(userCount[0]?.total ?? 0),
      auditEvents: Number(auditCount[0]?.total ?? 0),
    },
    organizations: orgList.map((o) => ({
      ...o,
      createdAtIso: o.createdAt.toISOString(),
    })),
    plans: planList,
  };
}

