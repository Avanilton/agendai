import { and, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { pricingCalculations, products, services } from "@/db/schema";

export interface SavedPricingItem {
  id: string;
  itemType: "service" | "product";
  serviceId: string | null;
  productId: string | null;
  itemName: string;
  inputs: Record<string, number>;
  totalCostCents: number;
  minimumPriceCents: number;
  recommendedPriceCents: number;
  estimatedProfitCents: number;
  realMarginPercent: string;
  createdAtIso: string;
}

export async function getPricingWorkspaceData(organizationId: string) {
  const db = getDb();

  const [savedRows, serviceRows, productRows] = await Promise.all([
    db
      .select()
      .from(pricingCalculations)
      .where(eq(pricingCalculations.organizationId, organizationId))
      .orderBy(desc(pricingCalculations.createdAt)),
    db
      .select({
        id: services.id,
        name: services.name,
        priceCents: services.priceCents,
        durationMinutes: services.durationMinutes,
        commissionBps: services.commissionBps,
      })
      .from(services)
      .where(
        and(
          eq(services.organizationId, organizationId),
          eq(services.status, "active"),
          isNull(services.deletedAt)
        )
      ),
    db
      .select({
        id: products.id,
        name: products.name,
        costCents: products.costCents,
        priceCents: products.priceCents,
      })
      .from(products)
      .where(
        and(
          eq(products.organizationId, organizationId),
          eq(products.status, "active"),
          isNull(products.deletedAt)
        )
      ),
  ]);

  const savedCalculations: SavedPricingItem[] = savedRows.map((row) => ({
    id: row.id,
    itemType: row.itemType === "product" ? "product" : "service",
    serviceId: row.serviceId,
    productId: row.productId,
    itemName: row.itemName,
    inputs: row.inputs,
    totalCostCents: row.totalCostCents,
    minimumPriceCents: row.minimumPriceCents,
    recommendedPriceCents: row.recommendedPriceCents,
    estimatedProfitCents: row.estimatedProfitCents,
    realMarginPercent: row.realMarginPercent,
    createdAtIso: row.createdAt.toISOString(),
  }));

  return {
    savedCalculations,
    services: serviceRows,
    products: productRows,
  };
}

