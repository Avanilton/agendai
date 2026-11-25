"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/tenant/context";
import type { ActionResult } from "@/modules/organizations/actions";
import {
  consumeSessionSchema,
  convertBudgetSchema,
  createBudgetSchema,
  createPackageSchema,
} from "./schemas";
import {
  consumePackageSession,
  convertBudgetToSale,
  createBudget,
  createClientPackage,
  updateBudgetStatus,
} from "./service";

export async function createPackageAction(
  rawInput: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await requirePermission("clients:write");
    const parsed = createPackageSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Dados do pacote inválidos.",
      };
    }

    const created = await createClientPackage({
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      input: parsed.data,
    });

    revalidatePath("/app/pacotes-orcamentos");
    revalidatePath("/app/financeiro");
    return { success: true, data: { id: created.id } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao criar pacote.",
    };
  }
}

export async function consumePackageSessionAction(
  packageId: string,
  rawInput: unknown
): Promise<ActionResult> {
  try {
    const ctx = await requirePermission("appointments:write");
    const parsed = consumeSessionSchema.safeParse(rawInput);
    if (!parsed.success) {
      return { success: false, error: "Dados inválidos." };
    }

    await consumePackageSession({
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      packageId,
      professionalId: parsed.data.professionalId || undefined,
      notes: parsed.data.notes || undefined,
    });

    revalidatePath("/app/pacotes-orcamentos");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Erro ao consumir sessão.",
    };
  }
}

export async function createBudgetAction(
  rawInput: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await requirePermission("clients:write");
    const parsed = createBudgetSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ?? "Dados do orçamento inválidos.",
      };
    }

    const created = await createBudget({
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      input: parsed.data,
    });

    revalidatePath("/app/pacotes-orcamentos");
    return { success: true, data: { id: created.id } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Erro ao criar orçamento.",
    };
  }
}

export async function updateBudgetStatusAction(
  budgetId: string,
  status: "sent" | "approved" | "rejected"
): Promise<ActionResult> {
  try {
    const ctx = await requirePermission("clients:write");
    await updateBudgetStatus({
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      budgetId,
      status,
    });

    revalidatePath("/app/pacotes-orcamentos");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Erro ao atualizar status.",
    };
  }
}

export async function convertBudgetToSaleAction(
  budgetId: string,
  rawInput: unknown
): Promise<ActionResult> {
  try {
    const ctx = await requirePermission("financial:write");
    const parsed = convertBudgetSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Dados de conversão inválidos.",
      };
    }

    await convertBudgetToSale({
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      budgetId,
      accountId: parsed.data.accountId,
      paymentMethod: parsed.data.paymentMethod,
      installments: parsed.data.installments,
    });

    revalidatePath("/app/pacotes-orcamentos");
    revalidatePath("/app/vendas");
    revalidatePath("/app/financeiro");
    revalidatePath("/app/estoque");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro ao converter orçamento em venda.",
    };
  }
}

