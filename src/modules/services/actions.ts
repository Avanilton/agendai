"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/tenant/context";
import type { ActionResult } from "@/modules/organizations/actions";
import { serviceInputSchema } from "./schemas";
import { createService, deleteService, updateService } from "./service";

export async function createServiceAction(
  rawInput: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await requirePermission("services:write");
    const parsed = serviceInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Dados do serviço inválidos.",
      };
    }

    const created = await createService({
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      input: parsed.data,
    });

    revalidatePath("/app/servicos");
    return { success: true, data: { id: created.id } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Erro ao cadastrar serviço.",
    };
  }
}

export async function updateServiceAction(
  serviceId: string,
  rawInput: unknown
): Promise<ActionResult> {
  try {
    const ctx = await requirePermission("services:write");
    const parsed = serviceInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Dados do serviço inválidos.",
      };
    }

    await updateService({
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      serviceId,
      input: parsed.data,
    });

    revalidatePath("/app/servicos");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Erro ao atualizar serviço.",
    };
  }
}

export async function deleteServiceAction(
  serviceId: string
): Promise<ActionResult> {
  try {
    const ctx = await requirePermission("services:write");
    await deleteService({
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      serviceId,
    });

    revalidatePath("/app/servicos");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Erro ao remover serviço.",
    };
  }
}

