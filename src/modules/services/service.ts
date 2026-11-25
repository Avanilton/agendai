import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import {
  professionals,
  professionalServices,
  services,
} from "@/db/schema";
import { assertTenantOwnership } from "@/lib/tenant/context";
import { logAudit } from "@/lib/security/audit";
import type { ServiceInput } from "./schemas";

export async function listServices(organizationId: string) {
  const db = getDb();

  const [serviceRows, linkRows] = await Promise.all([
    db
      .select()
      .from(services)
      .where(
        and(
          eq(services.organizationId, organizationId),
          isNull(services.deletedAt)
        )
      )
      .orderBy(asc(services.name)),
    db
      .select({
        serviceId: professionalServices.serviceId,
        professionalId: professionalServices.professionalId,
      })
      .from(professionalServices)
      .where(eq(professionalServices.organizationId, organizationId)),
  ]);

  const profsByService = new Map<string, string[]>();
  for (const link of linkRows) {
    const arr = profsByService.get(link.serviceId) ?? [];
    arr.push(link.professionalId);
    profsByService.set(link.serviceId, arr);
  }

  return serviceRows.map((svc) => ({
    ...svc,
    professionalIds: profsByService.get(svc.id) ?? [],
  }));
}

async function assertProfessionalsBelongToTenant(
  organizationId: string,
  professionalIds: string[]
) {
  if (professionalIds.length === 0) return;
  const db = getDb();
  const uniqueIds = Array.from(new Set(professionalIds));
  const validRows = await db
    .select({ id: professionals.id })
    .from(professionals)
    .where(
      and(
        eq(professionals.organizationId, organizationId),
        inArray(professionals.id, uniqueIds),
        isNull(professionals.deletedAt)
      )
    );

  if (validRows.length !== uniqueIds.length) {
    throw new Error(
      "Um ou mais profissionais selecionados não pertencem a esta organização."
    );
  }
}

export async function createService(params: {
  organizationId: string;
  actorUserId: string;
  input: ServiceInput;
}) {
  const db = getDb();
  const { organizationId, actorUserId, input } = params;

  await assertProfessionalsBelongToTenant(organizationId, input.professionalIds);

  const [created] = await db
    .insert(services)
    .values({
      organizationId,
      name: input.name,
      category: input.category || null,
      description: input.description || null,
      priceCents: Math.round(input.priceReais * 100),
      durationMinutes: input.durationMinutes,
      bufferMinutes: input.bufferMinutes,
      commissionBps: Math.round(input.commissionPercent * 100),
      color: input.color,
      status: input.status,
    })
    .returning();

  if (created && input.professionalIds.length > 0) {
    const uniqueIds = Array.from(new Set(input.professionalIds));
    await db.insert(professionalServices).values(
      uniqueIds.map((professionalId) => ({
        organizationId,
        professionalId,
        serviceId: created.id,
      }))
    );
  }

  await logAudit({
    organizationId,
    actorUserId,
    action: "service.created",
    resourceType: "service",
    resourceId: created?.id ?? null,
    metadata: { category: input.category || null, status: input.status },
  });

  return created!;
}

export async function updateService(params: {
  organizationId: string;
  actorUserId: string;
  serviceId: string;
  input: ServiceInput;
}) {
  const db = getDb();
  const { organizationId, actorUserId, serviceId, input } = params;

  const [existing] = await db
    .select({ id: services.id, organizationId: services.organizationId })
    .from(services)
    .where(and(eq(services.id, serviceId), isNull(services.deletedAt)))
    .limit(1);

  assertTenantOwnership(existing?.organizationId, organizationId);
  await assertProfessionalsBelongToTenant(organizationId, input.professionalIds);

  const [updated] = await db
    .update(services)
    .set({
      name: input.name,
      category: input.category || null,
      description: input.description || null,
      priceCents: Math.round(input.priceReais * 100),
      durationMinutes: input.durationMinutes,
      bufferMinutes: input.bufferMinutes,
      commissionBps: Math.round(input.commissionPercent * 100),
      color: input.color,
      status: input.status,
      updatedAt: new Date(),
    })
    .where(
      and(eq(services.id, serviceId), eq(services.organizationId, organizationId))
    )
    .returning();

  await db
    .delete(professionalServices)
    .where(
      and(
        eq(professionalServices.serviceId, serviceId),
        eq(professionalServices.organizationId, organizationId)
      )
    );

  if (input.professionalIds.length > 0) {
    const uniqueIds = Array.from(new Set(input.professionalIds));
    await db.insert(professionalServices).values(
      uniqueIds.map((professionalId) => ({
        organizationId,
        professionalId,
        serviceId,
      }))
    );
  }

  await logAudit({
    organizationId,
    actorUserId,
    action: "service.updated",
    resourceType: "service",
    resourceId: serviceId,
    metadata: { status: input.status },
  });

  return updated!;
}

export async function deleteService(params: {
  organizationId: string;
  actorUserId: string;
  serviceId: string;
}) {
  const db = getDb();
  const { organizationId, actorUserId, serviceId } = params;

  const [existing] = await db
    .select({ id: services.id, organizationId: services.organizationId })
    .from(services)
    .where(and(eq(services.id, serviceId), isNull(services.deletedAt)))
    .limit(1);

  assertTenantOwnership(existing?.organizationId, organizationId);

  await db
    .update(services)
    .set({ status: "inactive", deletedAt: new Date(), updatedAt: new Date() })
    .where(
      and(eq(services.id, serviceId), eq(services.organizationId, organizationId))
    );

  await logAudit({
    organizationId,
    actorUserId,
    action: "service.deleted",
    resourceType: "service",
    resourceId: serviceId,
  });
}

