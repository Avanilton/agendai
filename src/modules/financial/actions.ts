"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import {
  costCenters,
  financialAccounts,
  financialCategories,
} from "@/db/schema";
import { requirePermission } from "@/lib/tenant/context";
import type { ActionResult } from "@/modules/organizations/actions";
import {
  costCenterSchema,
  financialAccountSchema,
  financialCategorySchema,
  settleTransactionSchema,
  transactionInputSchema,
} from "./schemas";
import {
  cancelFinancialTransaction,
  createFinancialTransaction,
  settleFinancialTransaction,
} from "./service";

export async function createTransactionAction(
  rawInput: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await requirePermission("financial:write");
    const parsed = transactionInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Dados do lançamento inválidos.",
      };
    }

    const created = await createFinancialTransaction({
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      input: parsed.data,
    });

    revalidatePath("/app/financeiro");
    return { success: true, data: created };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Erro ao criar lançamento.",
    };
  }
}

export async function settleTransactionAction(
  transactionId: string,
  rawInput: unknown
): Promise<ActionResult> {
  try {
    const ctx = await requirePermission("financial:write");
    const parsed = settleTransactionSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Dados de baixa inválidos.",
      };
    }

    await settleFinancialTransaction({
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      transactionId,
      input: parsed.data,
    });

    revalidatePath("/app/financeiro");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Erro ao registrar pagamento.",
    };
  }
}

export async function cancelTransactionAction(
  transactionId: string
): Promise<ActionResult> {
  try {
    const ctx = await requirePermission("financial:write");
    await cancelFinancialTransaction({
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      transactionId,
    });

    revalidatePath("/app/financeiro");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Erro ao cancelar lançamento.",
    };
  }
}

export async function createFinancialAccountAction(
  rawInput: unknown
): Promise<ActionResult> {
  try {
    const ctx = await requirePermission("financial:write");
    const parsed = financialAccountSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Dados da conta inválidos.",
      };
    }

    const db = getDb();
    await db.insert(financialAccounts).values({
      organizationId: ctx.organizationId,
      name: parsed.data.name,
      type: parsed.data.type,
      initialBalanceCents: Math.round(parsed.data.initialBalanceReais * 100),
    });

    revalidatePath("/app/financeiro");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao criar conta.",
    };
  }
}

export async function createFinancialCategoryAction(
  rawInput: unknown
): Promise<ActionResult> {
  try {
    const ctx = await requirePermission("financial:write");
    const parsed = financialCategorySchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Dados da categoria inválidos.",
      };
    }

    const db = getDb();
    await db.insert(financialCategories).values({
      organizationId: ctx.organizationId,
      name: parsed.data.name,
      type: parsed.data.type,
      color: parsed.data.color,
    });

    revalidatePath("/app/financeiro");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao criar categoria.",
    };
  }
}

export async function createCostCenterAction(
  rawInput: unknown
): Promise<ActionResult> {
  try {
    const ctx = await requirePermission("financial:write");
    const parsed = costCenterSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Dados do centro de custo inválidos.",
      };
    }

    const db = getDb();
    await db.insert(costCenters).values({
      organizationId: ctx.organizationId,
      name: parsed.data.name,
      description: parsed.data.description || null,
    });

    revalidatePath("/app/financeiro");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro ao criar centro de custo.",
    };
  }
}

