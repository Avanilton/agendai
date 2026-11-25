"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { pricingCalculations, products, services } from "@/db/schema";
import { requirePermission } from "@/lib/tenant/context";
import { hasPermission } from "@/lib/permissions/evaluator";
import {
  calculateProductPricing,
  calculateServicePricing,
} from "@/modules/reports/pricing";
import type { SavedPricingItem } from "@/modules/reports/pricing-service";

const serviceInputsSchema = z.object({
  materialCostReais: z.number().min(0),
  durationMinutes: z.number().min(1),
  hourlyLaborCostReais: z.number().min(0),
  monthlyFixedCostsReais: z.number().min(0),
  monthlyBillableHours: z.number().min(1),
  variableCostReais: z.number().min(0),
  taxPercent: z.number().min(0).max(95),
  commissionPercent: z.number().min(0).max(95),
  paymentFeePercent: z.number().min(0).max(95),
  desiredMarginPercent: z.number().min(0).max(95),
});

const productInputsSchema = z.object({
  purchaseCostReais: z.number().min(0),
  freightAndPackagingReais: z.number().min(0),
  variableCostReais: z.number().min(0),
  fixedCostPerUnitReais: z.number().min(0),
  taxPercent: z.number().min(0).max(95),
  commissionPercent: z.number().min(0).max(95),
  paymentFeePercent: z.number().min(0).max(95),
  desiredMarginPercent: z.number().min(0).max(95),
});

const savePricingSchema = z.discriminatedUnion("itemType", [
  z.object({
    itemType: z.literal("service"),
    itemName: z.string().trim().min(2, "Informe o nome do serviço.").max(140),
    serviceId: z.string().uuid().optional().nullable(),
    applyToCatalog: z.boolean().optional(),
    inputs: serviceInputsSchema,
  }),
  z.object({
    itemType: z.literal("product"),
    itemName: z.string().trim().min(2, "Informe o nome do produto.").max(140),
    productId: z.string().uuid().optional().nullable(),
    applyToCatalog: z.boolean().optional(),
    inputs: productInputsSchema,
  }),
]);

export async function savePricingCalculationAction(
  rawInput: z.infer<typeof savePricingSchema>
): Promise<
  | { success: true; item: SavedPricingItem; catalogUpdated: boolean }
  | { success: false; error: string }
> {
  try {
    const ctx = await requirePermission("reports:read");
    const parsed = savePricingSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Dados de precificação inválidos.",
      };
    }

    const data = parsed.data;
    const output =
      data.itemType === "service"
        ? calculateServicePricing(data.inputs)
        : calculateProductPricing(data.inputs);

    if (!output.isFeasible) {
      return {
        success: false,
        error:
          "A soma de impostos, comissão, taxas e margem atingiu ou ultrapassou 100%.",
      };
    }

    const totalCostCents = Math.round(output.totalCostReais * 100);
    const minimumPriceCents = Math.round(output.minimumPriceReais * 100);
    const recommendedPriceCents = Math.round(output.recommendedPriceReais * 100);
    const estimatedProfitCents = Math.round(output.estimatedProfitReais * 100);
    const realMarginPercent = output.realMarginPercent.toFixed(1);

    const db = getDb();
    let catalogUpdated = false;
    let verifiedServiceId: string | null = null;
    let verifiedProductId: string | null = null;

    if (data.itemType === "service" && data.serviceId) {
      const [svc] = await db
        .select({ id: services.id })
        .from(services)
        .where(
          and(
            eq(services.id, data.serviceId),
            eq(services.organizationId, ctx.organizationId),
            isNull(services.deletedAt)
          )
        )
        .limit(1);

      if (svc) {
        verifiedServiceId = svc.id;
        if (
          data.applyToCatalog &&
          hasPermission(ctx.permissions, "services:write")
        ) {
          await db
            .update(services)
            .set({ priceCents: recommendedPriceCents, updatedAt: new Date() })
            .where(
              and(
                eq(services.id, svc.id),
                eq(services.organizationId, ctx.organizationId)
              )
            );
          catalogUpdated = true;
        }
      }
    }

    if (data.itemType === "product" && data.productId) {
      const [prod] = await db
        .select({ id: products.id })
        .from(products)
        .where(
          and(
            eq(products.id, data.productId),
            eq(products.organizationId, ctx.organizationId),
            isNull(products.deletedAt)
          )
        )
        .limit(1);

      if (prod) {
        verifiedProductId = prod.id;
        if (
          data.applyToCatalog &&
          hasPermission(ctx.permissions, "inventory:write")
        ) {
          await db
            .update(products)
            .set({
              priceCents: recommendedPriceCents,
              costCents: totalCostCents,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(products.id, prod.id),
                eq(products.organizationId, ctx.organizationId)
              )
            );
          catalogUpdated = true;
        }
      }
    }

    const [created] = await db
      .insert(pricingCalculations)
      .values({
        organizationId: ctx.organizationId,
        itemType: data.itemType,
        serviceId: verifiedServiceId,
        productId: verifiedProductId,
        itemName: data.itemName,
        inputs: data.inputs as Record<string, number>,
        totalCostCents,
        minimumPriceCents,
        recommendedPriceCents,
        estimatedProfitCents,
        realMarginPercent,
      })
      .returning();

    revalidatePath("/app/precificacao");
    if (catalogUpdated) {
      revalidatePath("/app/servicos");
      revalidatePath("/app/produtos");
    }

    return {
      success: true,
      catalogUpdated,
      item: {
        id: created!.id,
        itemType: created!.itemType === "product" ? "product" : "service",
        serviceId: created!.serviceId,
        productId: created!.productId,
        itemName: created!.itemName,
        inputs: created!.inputs,
        totalCostCents: created!.totalCostCents,
        minimumPriceCents: created!.minimumPriceCents,
        recommendedPriceCents: created!.recommendedPriceCents,
        estimatedProfitCents: created!.estimatedProfitCents,
        realMarginPercent: created!.realMarginPercent,
        createdAtIso: created!.createdAt.toISOString(),
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Não foi possível gravar o preço.",
    };
  }
}

export async function deletePricingCalculationAction(id: string) {
  try {
    const ctx = await requirePermission("reports:read");
    const db = getDb();
    await db
      .delete(pricingCalculations)
      .where(
        and(
          eq(pricingCalculations.id, id),
          eq(pricingCalculations.organizationId, ctx.organizationId)
        )
      );

    revalidatePath("/app/precificacao");
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error
          ? error.message
          : "Não foi possível remover o item.",
    };
  }
}

