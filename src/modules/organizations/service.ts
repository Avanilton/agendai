import { and, asc, eq, isNull, ne } from "drizzle-orm";
import { getDb, hasDatabaseUrl } from "@/db";
import { DEFAULT_PLANS_CATALOG, type PlanCatalogItem } from "@/db/plans-catalog";
import {
  memberships,
  organizations,
  permissions,
  plans,
  rolePermissions,
  roles,
  sessions,
  subscriptions,
  userConsents,
} from "@/db/schema";
import {
  DEFAULT_ROLE_TEMPLATES,
  PERMISSION_CATALOG,
} from "@/lib/permissions/catalog";
import { logAudit } from "@/lib/security/audit";
import type {
  OnboardingOrganizationInput,
  UpdateOrganizationInput,
} from "./schemas";

export async function getActivePlans(): Promise<PlanCatalogItem[]> {
  if (!hasDatabaseUrl()) {
    return DEFAULT_PLANS_CATALOG;
  }

  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(plans)
      .where(eq(plans.isActive, true))
      .orderBy(asc(plans.sortOrder));

    if (rows.length === 0) {
      return DEFAULT_PLANS_CATALOG;
    }

    return rows.map((row) => ({
      slug: row.slug as PlanCatalogItem["slug"],
      name: row.name,
      description: row.description,
      priceCents: row.priceCents,
      referencePriceCents: row.referencePriceCents,
      maxProfessionals: row.maxProfessionals,
      storageLimitMb: row.storageLimitMb,
      isPopular: row.isPopular,
      badgeText: row.badgeText,
      sortOrder: row.sortOrder,
      features: row.features,
      limits: row.limits,
    }));
  } catch {
    return DEFAULT_PLANS_CATALOG;
  }
}

export async function createOrganizationForUser(params: {
  userId: string;
  sessionId: string;
  input: OnboardingOrganizationInput;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const db = getDb();
  const { userId, sessionId, input, ipAddress, userAgent } = params;

  const [existingSlug] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.slug, input.slug))
    .limit(1);

  if (existingSlug) {
    throw new Error("Este endereço de agendamento já está em uso. Escolha outro.");
  }

  // Ensure permissions catalog exists in DB
  for (const perm of PERMISSION_CATALOG) {
    await db
      .insert(permissions)
      .values(perm)
      .onConflictDoNothing({ target: permissions.code });
  }

  const allPermissions = await db.select().from(permissions);
  const permByCode = new Map(allPermissions.map((p) => [p.code, p.id]));

  // Ensure selected plan exists in DB
  let [selectedPlan] = await db
    .select()
    .from(plans)
    .where(eq(plans.slug, input.planSlug))
    .limit(1);

  if (!selectedPlan) {
    const catalogPlan =
      DEFAULT_PLANS_CATALOG.find((p) => p.slug === input.planSlug) ??
      DEFAULT_PLANS_CATALOG[0]!;
    const [insertedPlan] = await db
      .insert(plans)
      .values({
        slug: catalogPlan.slug,
        name: catalogPlan.name,
        description: catalogPlan.description,
        priceCents: catalogPlan.priceCents,
        referencePriceCents: catalogPlan.referencePriceCents,
        maxProfessionals: catalogPlan.maxProfessionals,
        storageLimitMb: catalogPlan.storageLimitMb,
        isPopular: catalogPlan.isPopular,
        badgeText: catalogPlan.badgeText,
        features: catalogPlan.features,
        limits: catalogPlan.limits,
        sortOrder: catalogPlan.sortOrder,
        isActive: true,
      })
      .returning();
    selectedPlan = insertedPlan!;
  }

  const [org] = await db
    .insert(organizations)
    .values({
      name: input.name,
      slug: input.slug,
      segment: input.segment,
      phone: input.phone || null,
      timezone: input.timezone,
      status: "trial",
      onboardingCompletedAt: new Date(),
    })
    .returning();

  if (!org) {
    throw new Error("Não foi possível criar a organização.");
  }

  // Provision default RBAC roles for this tenant
  let ownerRoleId: string | null = null;
  for (const template of DEFAULT_ROLE_TEMPLATES) {
    const [createdRole] = await db
      .insert(roles)
      .values({
        organizationId: org.id,
        slug: template.slug,
        name: template.name,
        description: template.description,
        isSystem: true,
      })
      .returning();

    if (!createdRole) continue;
    if (template.slug === "owner") {
      ownerRoleId = createdRole.id;
    }

    const permInserts = template.permissions
      .map((code) => permByCode.get(code))
      .filter((id): id is string => Boolean(id))
      .map((permissionId) => ({
        roleId: createdRole.id,
        permissionId,
      }));

    if (permInserts.length > 0) {
      await db.insert(rolePermissions).values(permInserts).onConflictDoNothing();
    }
  }

  if (!ownerRoleId) {
    throw new Error("Falha ao provisionar perfil de Proprietário.");
  }

  await db.insert(memberships).values({
    organizationId: org.id,
    userId,
    roleId: ownerRoleId,
    status: "active",
  });

  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 14);

  await db.insert(subscriptions).values({
    organizationId: org.id,
    planId: selectedPlan.id,
    status: "trial",
    trialEndsAt,
    currentPeriodStart: new Date(),
    currentPeriodEnd: trialEndsAt,
  });

  await db
    .update(sessions)
    .set({ activeOrganizationId: org.id, updatedAt: new Date() })
    .where(eq(sessions.id, sessionId));

  await logAudit({
    organizationId: org.id,
    actorUserId: userId,
    action: "organization.created",
    resourceType: "organization",
    resourceId: org.id,
    metadata: {
      segment: org.segment,
      planSlug: selectedPlan.slug,
      timezone: org.timezone,
    },
    ipAddress,
    userAgent,
  });

  return org;
}

export async function recordUserConsents(params: {
  userId: string;
  organizationId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  if (!hasDatabaseUrl()) return;
  const db = getDb();

  const types = [
    "terms_of_use",
    "privacy_policy",
    "lgpd_data_processing",
  ] as const;

  await db.insert(userConsents).values(
    types.map((consentType) => ({
      userId: params.userId,
      organizationId: params.organizationId ?? null,
      consentType,
      version: "1.0.0",
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
    }))
  );
}

export async function getOrganizationById(organizationId: string) {
  const db = getDb();
  const [org] = await db
    .select()
    .from(organizations)
    .where(and(eq(organizations.id, organizationId), isNull(organizations.deletedAt)))
    .limit(1);
  return org ?? null;
}

export async function updateOrganization(params: {
  organizationId: string;
  actorUserId: string;
  input: UpdateOrganizationInput;
}) {
  const db = getDb();
  const { organizationId, actorUserId, input } = params;

  const [conflict] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(
      and(eq(organizations.slug, input.slug), ne(organizations.id, organizationId))
    )
    .limit(1);

  if (conflict) {
    throw new Error("Este endereço de agendamento já está em uso por outra empresa.");
  }

  const [updated] = await db
    .update(organizations)
    .set({
      name: input.name,
      slug: input.slug,
      segment: input.segment,
      document: input.document || null,
      phone: input.phone || null,
      email: input.email ? input.email.toLowerCase() : null,
      address: input.address || null,
      timezone: input.timezone,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, organizationId))
    .returning();

  await logAudit({
    organizationId,
    actorUserId,
    action: "organization.updated",
    resourceType: "organization",
    resourceId: organizationId,
    metadata: { segment: input.segment, timezone: input.timezone },
  });

  return updated!;
}

