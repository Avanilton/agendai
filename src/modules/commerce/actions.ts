"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/tenant/context";
import type { ActionResult } from "@/modules/organizations/actions";
import {
  createPurchaseSchema,
  createSaleSchema,
  manualMovementSchema,
} from "./schemas";
import {
  createIntegratedPurchase,
  createIntegratedSale,
  registerManualStockMovement,
} from "./service";

export async function createSaleAction(
  rawInput: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await requirePermission("financial:write");
    const parsed = createSaleSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Dados da venda inválidos.",
      };
    }

    const created = await createIntegratedSale({
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      input: parsed.data,
    });

    revalidatePath("/app/vendas");
    revalidatePath("/app/estoque");
    revalidatePath("/app/produtos");
    revalidatePath("/app/financeiro");
    return { success: true, data: { id: created.id } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao registrar venda.",
    };
  }
}

export async function createPurchaseAction(
  rawInput: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await requirePermission("inventory:write");
    const parsed = createPurchaseSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Dados da compra inválidos.",
      };
    }

    const created = await createIntegratedPurchase({
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      input: parsed.data,
    });

    revalidatePath("/app/estoque");
    revalidatePath("/app/produtos");
    revalidatePath("/app/financeiro");
    return { success: true, data: { id: created.id } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Erro ao registrar compra.",
    };
  }
}

export async function createStockMovementAction(
  rawInput: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await requirePermission("inventory:write");
    const parsed = manualMovementSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ??
          "Dados da movimentação inválidos.",
      };
    }

    const movement = await registerManualStockMovement({
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      input: parsed.data,
    });

    revalidatePath("/app/estoque");
    revalidatePath("/app/produtos");
    return { success: true, data: { id: movement.id } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro ao movimentar estoque.",
    };
  }
}

