import { and, asc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { suppliers } from "@/db/schema";
import { assertTenantOwnership } from "@/lib/tenant/context";
import { logAudit } from "@/lib/security/audit";
import type { SupplierInput } from "./schemas";

export async function listSuppliers(organizationId: string) {
  const db = getDb();
  return db
    .select()
    .from(suppliers)
    .where(
      and(
        eq(suppliers.organizationId, organizationId),
        isNull(suppliers.deletedAt)
      )
    )
    .orderBy(asc(suppliers.name));
}

export async function createSupplier(params: {
  organizationId: string;
  actorUserId: string;
  input: SupplierInput;
}) {
  const db = getDb();
  const { organizationId, actorUserId, input } = params;

  const [created] = await db
    .insert(suppliers)
    .values({
      organizationId,
      name: input.name,
      document: input.document || null,
      contactName: input.contactName || null,
      phone: input.phone || null,
      email: input.email ? input.email.toLowerCase() : null,
      address: input.address || null,
      notes: input.notes || null,
      status: input.status,
    })
    .returning();

  await logAudit({
    organizationId,
    actorUserId,
    action: "supplier.created",
    resourceType: "supplier",
    resourceId: created?.id ?? null,
    metadata: { status: input.status },
  });

  return created!;
}

export async function updateSupplier(params: {
  organizationId: string;
  actorUserId: string;
  supplierId: string;
  input: SupplierInput;
}) {
  const db = getDb();
  const { organizationId, actorUserId, supplierId, input } = params;

  const [existing] = await db
    .select({ id: suppliers.id, organizationId: suppliers.organizationId })
    .from(suppliers)
    .where(and(eq(suppliers.id, supplierId), isNull(suppliers.deletedAt)))
    .limit(1);

  assertTenantOwnership(existing?.organizationId, organizationId);

  const [updated] = await db
    .update(suppliers)
    .set({
      name: input.name,
      document: input.document || null,
      contactName: input.contactName || null,
      phone: input.phone || null,
      email: input.email ? input.email.toLowerCase() : null,
      address: input.address || null,
      notes: input.notes || null,
      status: input.status,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(suppliers.id, supplierId),
        eq(suppliers.organizationId, organizationId)
      )
    )
    .returning();

  await logAudit({
    organizationId,
    actorUserId,
    action: "supplier.updated",
    resourceType: "supplier",
    resourceId: supplierId,
    metadata: { status: input.status },
  });

  return updated!;
}

export async function deleteSupplier(params: {
  organizationId: string;
  actorUserId: string;
  supplierId: string;
}) {
  const db = getDb();
  const { organizationId, actorUserId, supplierId } = params;

  const [existing] = await db
    .select({ id: suppliers.id, organizationId: suppliers.organizationId })
    .from(suppliers)
    .where(and(eq(suppliers.id, supplierId), isNull(suppliers.deletedAt)))
    .limit(1);

  assertTenantOwnership(existing?.organizationId, organizationId);

  await db
    .update(suppliers)
    .set({ status: "inactive", deletedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(suppliers.id, supplierId),
        eq(suppliers.organizationId, organizationId)
      )
    );

  await logAudit({
    organizationId,
    actorUserId,
    action: "supplier.deleted",
    resourceType: "supplier",
    resourceId: supplierId,
  });
}

