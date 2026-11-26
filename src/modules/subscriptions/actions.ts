"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/tenant/context";
import type { ActionResult } from "@/modules/organizations/actions";
import {
  assignClientSubscriptionSchema,
  subscriptionPlanInputSchema,
} from "./schemas";
import {
  assignClientSubscription,
  createSubscriptionPlan,
  deleteSubscriptionPlan,
  toggleSubscriptionPlanActive,
  updateClientSubscriptionStatus,
  updateSubscriptionPlan,
} from "./service";

export async function createSubscriptionPlanAction(
  rawInput: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await requirePermission("services:write");
    const parsed = subscriptionPlanInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Dados do plano inválidos.",
      };
    }

    const created = await createSubscriptionPlan({
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      input: parsed.data,
    });

    revalidatePath("/app/planos-assinatura");
    revalidatePath("/app/clientes");
    revalidatePath("/app/agenda");
    return { success: true, data: { id: created.id } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao criar plano.",
    };
  }
}

export async function updateSubscriptionPlanAction(
  planId: string,
  rawInput: unknown
): Promise<ActionResult> {
  try {
    const ctx = await requirePermission("services:write");
    const parsed = subscriptionPlanInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Dados do plano inválidos.",
      };
    }

    await updateSubscriptionPlan({
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      planId,
      input: parsed.data,
    });

    revalidatePath("/app/planos-assinatura");
    revalidatePath("/app/clientes");
    revalidatePath("/app/agenda");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao atualizar plano.",
    };
  }
}

export async function toggleSubscriptionPlanAction(
  planId: string,
  isActive: boolean
): Promise<ActionResult> {
  try {
    const ctx = await requirePermission("services:write");
    await toggleSubscriptionPlanActive({
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      planId,
      isActive,
    });

    revalidatePath("/app/planos-assinatura");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao alterar status.",
    };
  }
}

export async function deleteSubscriptionPlanAction(
  planId: string
): Promise<ActionResult> {
  try {
    const ctx = await requirePermission("services:write");
    await deleteSubscriptionPlan({
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      planId,
    });

    revalidatePath("/app/planos-assinatura");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao excluir plano.",
    };
  }
}

export async function assignClientSubscriptionAction(
  rawInput: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await requirePermission("clients:write");
    const parsed = assignClientSubscriptionSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ?? "Dados da assinatura inválidos.",
      };
    }

    const created = await assignClientSubscription({
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      input: parsed.data,
    });

    revalidatePath(`/app/clientes/${parsed.data.clientId}`);
    revalidatePath("/app/clientes");
    revalidatePath("/app/agenda");
    return { success: true, data: { id: created.id } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Erro ao vincular plano.",
    };
  }
}

export async function updateClientSubscriptionStatusAction(
  subscriptionId: string,
  status: "active" | "paused" | "cancelled"
): Promise<ActionResult> {
  try {
    const ctx = await requirePermission("clients:write");
    const clientId = await updateClientSubscriptionStatus({
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      subscriptionId,
      status,
    });

    revalidatePath(`/app/clientes/${clientId}`);
    revalidatePath("/app/clientes");
    revalidatePath("/app/agenda");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro ao atualizar assinatura.",
    };
  }
}

