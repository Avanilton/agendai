import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import {
  clients,
  clientSubscriptions,
  subscriptionPlans,
  type SubscriptionPlanItem,
} from "@/db/schema";
import { assertTenantOwnership } from "@/lib/tenant/context";
import { logAudit } from "@/lib/security/audit";
import type {
  AssignClientSubscriptionInput,
  SubscriptionPlanInput,
} from "./schemas";

export interface SubscriptionPlanRow {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  includedItems: SubscriptionPlanItem[];
  paymentMethod: "pix" | "cash" | "credit_card" | "debit_card" | "bank_transfer" | "other";
  billingDueDay: number;
  isActive: boolean;
  createdAtIso: string;
}

export interface ActiveClientSubscriptionSummary {
  subscriptionId: string;
  clientId: string;
  planId: string;
  planName: string;
  priceCents: number;
  paymentMethod: string;
  billingDueDay: number;
  status: "active" | "paused" | "cancelled";
  includedItems: SubscriptionPlanItem[];
  notes: string | null;
  startedAtIso: string;
}

export async function listSubscriptionPlans(
  organizationId: string,
  onlyActive?: boolean
): Promise<SubscriptionPlanRow[]> {
  const db = getDb();
  const conditions = [
    eq(subscriptionPlans.organizationId, organizationId),
    isNull(subscriptionPlans.deletedAt),
  ];
  if (onlyActive) {
    conditions.push(eq(subscriptionPlans.isActive, true));
  }

  const rows = await db
    .select()
    .from(subscriptionPlans)
    .where(and(...conditions))
    .orderBy(asc(subscriptionPlans.name));

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    priceCents: r.priceCents,
    includedItems: r.includedItems ?? [],
    paymentMethod: r.paymentMethod,
    billingDueDay: r.billingDueDay,
    isActive: r.isActive,
    createdAtIso: r.createdAt.toISOString(),
  }));
}

export async function createSubscriptionPlan(params: {
  organizationId: string;
  actorUserId: string;
  input: SubscriptionPlanInput;
}) {
  const db = getDb();
  const { organizationId, actorUserId, input } = params;

  const [created] = await db
    .insert(subscriptionPlans)
    .values({
      organizationId,
      name: input.name,
      description: input.description || null,
      priceCents: Math.round(input.priceReais * 100),
      includedItems: input.includedItems,
      paymentMethod: input.paymentMethod,
      billingDueDay: input.billingDueDay,
      isActive: input.isActive,
    })
    .returning();

  await logAudit({
    organizationId,
    actorUserId,
    action: "subscription_plan.created",
    resourceType: "subscription_plan",
    resourceId: created!.id,
    metadata: { name: input.name, billingDueDay: input.billingDueDay },
  });

  return created!;
}

export async function updateSubscriptionPlan(params: {
  organizationId: string;
  actorUserId: string;
  planId: string;
  input: SubscriptionPlanInput;
}) {
  const db = getDb();
  const { organizationId, actorUserId, planId, input } = params;

  const [existing] = await db
    .select({
      id: subscriptionPlans.id,
      organizationId: subscriptionPlans.organizationId,
    })
    .from(subscriptionPlans)
    .where(
      and(eq(subscriptionPlans.id, planId), isNull(subscriptionPlans.deletedAt))
    )
    .limit(1);

  assertTenantOwnership(existing?.organizationId, organizationId);

  const [updated] = await db
    .update(subscriptionPlans)
    .set({
      name: input.name,
      description: input.description || null,
      priceCents: Math.round(input.priceReais * 100),
      includedItems: input.includedItems,
      paymentMethod: input.paymentMethod,
      billingDueDay: input.billingDueDay,
      isActive: input.isActive,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(subscriptionPlans.id, planId),
        eq(subscriptionPlans.organizationId, organizationId)
      )
    )
    .returning();

  await logAudit({
    organizationId,
    actorUserId,
    action: "subscription_plan.updated",
    resourceType: "subscription_plan",
    resourceId: planId,
    metadata: { isActive: input.isActive },
  });

  return updated!;
}

export async function toggleSubscriptionPlanActive(params: {
  organizationId: string;
  actorUserId: string;
  planId: string;
  isActive: boolean;
}) {
  const db = getDb();
  const { organizationId, actorUserId, planId, isActive } = params;

  const [existing] = await db
    .select({
      id: subscriptionPlans.id,
      organizationId: subscriptionPlans.organizationId,
    })
    .from(subscriptionPlans)
    .where(
      and(eq(subscriptionPlans.id, planId), isNull(subscriptionPlans.deletedAt))
    )
    .limit(1);

  assertTenantOwnership(existing?.organizationId, organizationId);

  await db
    .update(subscriptionPlans)
    .set({ isActive, updatedAt: new Date() })
    .where(
      and(
        eq(subscriptionPlans.id, planId),
        eq(subscriptionPlans.organizationId, organizationId)
      )
    );

  await logAudit({
    organizationId,
    actorUserId,
    action: "subscription_plan.toggled",
    resourceType: "subscription_plan",
    resourceId: planId,
    metadata: { isActive },
  });
}

export async function deleteSubscriptionPlan(params: {
  organizationId: string;
  actorUserId: string;
  planId: string;
}) {
  const db = getDb();
  const { organizationId, actorUserId, planId } = params;

  const [existing] = await db
    .select({
      id: subscriptionPlans.id,
      organizationId: subscriptionPlans.organizationId,
    })
    .from(subscriptionPlans)
    .where(
      and(eq(subscriptionPlans.id, planId), isNull(subscriptionPlans.deletedAt))
    )
    .limit(1);

  assertTenantOwnership(existing?.organizationId, organizationId);

  await db
    .update(subscriptionPlans)
    .set({ deletedAt: new Date(), isActive: false, updatedAt: new Date() })
    .where(
      and(
        eq(subscriptionPlans.id, planId),
        eq(subscriptionPlans.organizationId, organizationId)
      )
    );

  await logAudit({
    organizationId,
    actorUserId,
    action: "subscription_plan.deleted",
    resourceType: "subscription_plan",
    resourceId: planId,
  });
}

export async function assignClientSubscription(params: {
  organizationId: string;
  actorUserId: string;
  input: AssignClientSubscriptionInput;
}) {
  const db = getDb();
  const { organizationId, actorUserId, input } = params;

  const [cli] = await db
    .select({ id: clients.id, organizationId: clients.organizationId })
    .from(clients)
    .where(and(eq(clients.id, input.clientId), isNull(clients.deletedAt)))
    .limit(1);
  assertTenantOwnership(cli?.organizationId, organizationId);

  const [plan] = await db
    .select({
      id: subscriptionPlans.id,
      organizationId: subscriptionPlans.organizationId,
    })
    .from(subscriptionPlans)
    .where(
      and(
        eq(subscriptionPlans.id, input.planId),
        isNull(subscriptionPlans.deletedAt)
      )
    )
    .limit(1);
  assertTenantOwnership(plan?.organizationId, organizationId);

  // Cancel any previously active subscriptions for this client if assigning an active one
  if (input.status === "active") {
    await db
      .update(clientSubscriptions)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(
        and(
          eq(clientSubscriptions.organizationId, organizationId),
          eq(clientSubscriptions.clientId, input.clientId),
          eq(clientSubscriptions.status, "active")
        )
      );
  }

  const [created] = await db
    .insert(clientSubscriptions)
    .values({
      organizationId,
      clientId: input.clientId,
      planId: input.planId,
      status: input.status,
      paymentMethod: input.paymentMethod,
      billingDueDay: input.billingDueDay,
      notes: input.notes || null,
    })
    .returning();

  await logAudit({
    organizationId,
    actorUserId,
    action: "client_subscription.assigned",
    resourceType: "client_subscription",
    resourceId: created!.id,
    metadata: { clientId: input.clientId, planId: input.planId },
  });

  return created!;
}

export async function updateClientSubscriptionStatus(params: {
  organizationId: string;
  actorUserId: string;
  subscriptionId: string;
  status: "active" | "paused" | "cancelled";
}) {
  const db = getDb();
  const { organizationId, actorUserId, subscriptionId, status } = params;

  const [existing] = await db
    .select({
      id: clientSubscriptions.id,
      organizationId: clientSubscriptions.organizationId,
      clientId: clientSubscriptions.clientId,
    })
    .from(clientSubscriptions)
    .where(eq(clientSubscriptions.id, subscriptionId))
    .limit(1);

  assertTenantOwnership(existing?.organizationId, organizationId);

  await db
    .update(clientSubscriptions)
    .set({ status, updatedAt: new Date() })
    .where(
      and(
        eq(clientSubscriptions.id, subscriptionId),
        eq(clientSubscriptions.organizationId, organizationId)
      )
    );

  await logAudit({
    organizationId,
    actorUserId,
    action: "client_subscription.status_updated",
    resourceType: "client_subscription",
    resourceId: subscriptionId,
    metadata: { status },
  });

  return existing!.clientId;
}

export async function listActiveClientSubscriptionsMap(
  organizationId: string
): Promise<Record<string, ActiveClientSubscriptionSummary>> {
  const db = getDb();
  const rows = await db
    .select({
      subscriptionId: clientSubscriptions.id,
      clientId: clientSubscriptions.clientId,
      planId: clientSubscriptions.planId,
      planName: subscriptionPlans.name,
      priceCents: subscriptionPlans.priceCents,
      paymentMethod: clientSubscriptions.paymentMethod,
      billingDueDay: clientSubscriptions.billingDueDay,
      status: clientSubscriptions.status,
      includedItems: subscriptionPlans.includedItems,
      notes: clientSubscriptions.notes,
      startedAt: clientSubscriptions.startedAt,
    })
    .from(clientSubscriptions)
    .innerJoin(
      subscriptionPlans,
      eq(clientSubscriptions.planId, subscriptionPlans.id)
    )
    .where(
      and(
        eq(clientSubscriptions.organizationId, organizationId),
        eq(clientSubscriptions.status, "active"),
        isNull(subscriptionPlans.deletedAt)
      )
    )
    .orderBy(desc(clientSubscriptions.startedAt));

  const map: Record<string, ActiveClientSubscriptionSummary> = {};
  for (const r of rows) {
    if (!map[r.clientId]) {
      map[r.clientId] = {
        subscriptionId: r.subscriptionId,
        clientId: r.clientId,
        planId: r.planId,
        planName: r.planName,
        priceCents: r.priceCents,
        paymentMethod: r.paymentMethod,
        billingDueDay: r.billingDueDay,
        status: r.status,
        includedItems: r.includedItems ?? [],
        notes: r.notes,
        startedAtIso: r.startedAt.toISOString(),
      };
    }
  }
  return map;
}

