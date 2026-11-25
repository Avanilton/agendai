import { and, count, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { plans, professionals, subscriptions } from "@/db/schema";

export interface PlanUsageSummary {
  planName: string;
  planSlug: string;
  maxProfessionals: number;
  activeProfessionals: number;
  canAddProfessional: boolean;
}

/**
 * Pure check for professional seat limit against active plan.
 */
export function canAddActiveProfessional(
  activeCount: number,
  maxProfessionals: number
): boolean {
  return activeCount < maxProfessionals;
}

/**
 * Calculates product profit margin percentage from cost and sale price in cents.
 */
export function calculateMarginPercent(
  costCents: number,
  priceCents: number
): number {
  if (priceCents <= 0) return 0;
  return Number((((priceCents - costCents) / priceCents) * 100).toFixed(1));
}

export async function getOrganizationPlanUsage(
  organizationId: string
): Promise<PlanUsageSummary> {
  const db = getDb();

  const [subRow] = await db
    .select({
      planName: plans.name,
      planSlug: plans.slug,
      maxProfessionals: plans.maxProfessionals,
    })
    .from(subscriptions)
    .innerJoin(plans, eq(subscriptions.planId, plans.id))
    .where(eq(subscriptions.organizationId, organizationId))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);

  const [countRow] = await db
    .select({ total: count() })
    .from(professionals)
    .where(
      and(
        eq(professionals.organizationId, organizationId),
        eq(professionals.status, "active"),
        isNull(professionals.deletedAt)
      )
    );

  const maxProfessionals = subRow?.maxProfessionals ?? 1;
  const activeProfessionals = Number(countRow?.total ?? 0);

  return {
    planName: subRow?.planName ?? "Individual",
    planSlug: subRow?.planSlug ?? "individual",
    maxProfessionals,
    activeProfessionals,
    canAddProfessional: canAddActiveProfessional(
      activeProfessionals,
      maxProfessionals
    ),
  };
}

