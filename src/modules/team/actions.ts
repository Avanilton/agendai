"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/tenant/context";
import type { ActionResult } from "@/modules/organizations/actions";
import {
  createCommissionSchema,
  createGoalSchema,
  createTimeEntrySchema,
  payCommissionSchema,
} from "./schemas";
import {
  createCommissionEntry,
  createProfessionalGoal,
  createTimeEntry,
  payCommissionAndLogExpense,
} from "./service";

export async function createCommissionAction(
  rawInput: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await requirePermission("team:manage");
    const parsed = createCommissionSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Dados da comissão inválidos.",
      };
    }

    const created = await createCommissionEntry({
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      input: parsed.data,
    });

    revalidatePath("/app/equipe");
    return { success: true, data: { id: created.id } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Erro ao lançar comissão.",
    };
  }
}

export async function payCommissionAction(
  commissionId: string,
  rawInput: unknown
): Promise<ActionResult> {
  try {
    const ctx = await requirePermission("financial:write");
    const parsed = payCommissionSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ?? "Dados do pagamento inválidos.",
      };
    }

    await payCommissionAndLogExpense({
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      commissionId,
      accountId: parsed.data.accountId,
      paymentMethod: parsed.data.paymentMethod,
    });

    revalidatePath("/app/equipe");
    revalidatePath("/app/financeiro");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Erro ao pagar comissão.",
    };
  }
}

export async function createTimeEntryAction(
  rawInput: unknown
): Promise<ActionResult> {
  try {
    const ctx = await requirePermission("team:manage");
    const parsed = createTimeEntrySchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Dados do registro inválidos.",
      };
    }

    await createTimeEntry({
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      input: parsed.data,
    });

    revalidatePath("/app/equipe");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Erro ao registrar horas/falta.",
    };
  }
}

export async function createGoalAction(
  rawInput: unknown
): Promise<ActionResult> {
  try {
    const ctx = await requirePermission("team:manage");
    const parsed = createGoalSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Dados da meta inválidos.",
      };
    }

    await createProfessionalGoal({
      organizationId: ctx.organizationId,
      input: parsed.data,
    });

    revalidatePath("/app/equipe");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao salvar meta.",
    };
  }
}

