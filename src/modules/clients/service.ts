import { and, asc, eq, ilike, isNull, ne, or } from "drizzle-orm";
import { getDb } from "@/db";
import { clients } from "@/db/schema";
import { assertTenantOwnership } from "@/lib/tenant/context";
import { logAudit } from "@/lib/security/audit";
import type { ClientInput } from "./schemas";

export interface ClientListFilter {
  search?: string;
  status?: "all" | "active" | "inactive" | "blocked";
  birthMonthOnly?: boolean;
}

export async function listClients(
  organizationId: string,
  filter?: ClientListFilter
) {
  const db = getDb();
  const conditions = [
    eq(clients.organizationId, organizationId),
    isNull(clients.deletedAt),
  ];

  if (filter?.status && filter.status !== "all") {
    conditions.push(eq(clients.status, filter.status));
  }

  if (filter?.search && filter.search.trim().length > 0) {
    const q = `%${filter.search.trim()}%`;
    conditions.push(
      or(
        ilike(clients.name, q),
        ilike(clients.email, q),
        ilike(clients.phone, q),
        ilike(clients.whatsapp, q),
        ilike(clients.cpf, q)
      )!
    );
  }

  const rows = await db
    .select()
    .from(clients)
    .where(and(...conditions))
    .orderBy(asc(clients.name))
    .limit(200);

  if (filter?.birthMonthOnly) {
    const currentMonth = String(new Date().getMonth() + 1).padStart(2, "0");
    return rows.filter(
      (r) => r.birthDate && r.birthDate.slice(5, 7) === currentMonth
    );
  }

  return rows;
}

async function assertNoDuplicateClient(
  organizationId: string,
  input: ClientInput,
  excludeId?: string
) {
  const db = getDb();
  const dupChecks = [];
  if (input.cpf && input.cpf.trim()) {
    dupChecks.push(eq(clients.cpf, input.cpf.trim()));
  }
  if (input.email && input.email.trim()) {
    dupChecks.push(eq(clients.email, input.email.trim().toLowerCase()));
  }
  if (dupChecks.length === 0) return;

  const conditions = [
    eq(clients.organizationId, organizationId),
    isNull(clients.deletedAt),
    or(...dupChecks)!,
  ];
  if (excludeId) {
    conditions.push(ne(clients.id, excludeId));
  }

  const [existing] = await db
    .select({ id: clients.id, name: clients.name })
    .from(clients)
    .where(and(...conditions))
    .limit(1);

  if (existing) {
    throw new Error(
      `Já existe um cliente cadastrado com o mesmo CPF ou e-mail (${existing.name}).`
    );
  }
}

export async function createClient(params: {
  organizationId: string;
  actorUserId: string;
  input: ClientInput;
}) {
  const db = getDb();
  const { organizationId, actorUserId, input } = params;

  await assertNoDuplicateClient(organizationId, input);

  const [created] = await db
    .insert(clients)
    .values({
      organizationId,
      name: input.name,
      cpf: input.cpf || null,
      phone: input.phone || null,
      whatsapp: input.whatsapp || input.phone || null,
      email: input.email ? input.email.toLowerCase() : null,
      birthDate: input.birthDate || null,
      address: input.address || null,
      notes: input.notes || null,
      tags: input.tags,
      origin: input.origin || null,
      status: input.status,
      contactPreferences: {
        whatsapp: input.whatsappOptIn,
        email: input.emailOptIn,
        sms: false,
      },
      lgpdConsentAt: input.lgpdConsent ? new Date() : null,
    })
    .returning();

  await logAudit({
    organizationId,
    actorUserId,
    action: "client.created",
    resourceType: "client",
    resourceId: created?.id ?? null,
    metadata: { status: input.status, origin: input.origin || null },
  });

  return created!;
}

export async function updateClient(params: {
  organizationId: string;
  actorUserId: string;
  clientId: string;
  input: ClientInput;
}) {
  const db = getDb();
  const { organizationId, actorUserId, clientId, input } = params;

  const [existing] = await db
    .select({
      id: clients.id,
      organizationId: clients.organizationId,
      lgpdConsentAt: clients.lgpdConsentAt,
    })
    .from(clients)
    .where(and(eq(clients.id, clientId), isNull(clients.deletedAt)))
    .limit(1);

  assertTenantOwnership(existing?.organizationId, organizationId);
  await assertNoDuplicateClient(organizationId, input, clientId);

  const [updated] = await db
    .update(clients)
    .set({
      name: input.name,
      cpf: input.cpf || null,
      phone: input.phone || null,
      whatsapp: input.whatsapp || input.phone || null,
      email: input.email ? input.email.toLowerCase() : null,
      birthDate: input.birthDate || null,
      address: input.address || null,
      notes: input.notes || null,
      tags: input.tags,
      origin: input.origin || null,
      status: input.status,
      contactPreferences: {
        whatsapp: input.whatsappOptIn,
        email: input.emailOptIn,
        sms: false,
      },
      lgpdConsentAt: input.lgpdConsent
        ? existing?.lgpdConsentAt ?? new Date()
        : null,
      updatedAt: new Date(),
    })
    .where(
      and(eq(clients.id, clientId), eq(clients.organizationId, organizationId))
    )
    .returning();

  await logAudit({
    organizationId,
    actorUserId,
    action: "client.updated",
    resourceType: "client",
    resourceId: clientId,
    metadata: { status: input.status },
  });

  return updated!;
}

export async function deleteClient(params: {
  organizationId: string;
  actorUserId: string;
  clientId: string;
}) {
  const db = getDb();
  const { organizationId, actorUserId, clientId } = params;

  const [existing] = await db
    .select({ id: clients.id, organizationId: clients.organizationId })
    .from(clients)
    .where(and(eq(clients.id, clientId), isNull(clients.deletedAt)))
    .limit(1);

  assertTenantOwnership(existing?.organizationId, organizationId);

  await db
    .update(clients)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(
      and(eq(clients.id, clientId), eq(clients.organizationId, organizationId))
    );

  await logAudit({
    organizationId,
    actorUserId,
    action: "client.deleted",
    resourceType: "client",
    resourceId: clientId,
  });
}

