"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/tenant/context";
import type { ActionResult } from "@/modules/organizations/actions";
import { clientInputSchema } from "./schemas";
import { createClient, deleteClient, updateClient } from "./service";

export async function createClientAction(
  rawInput: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await requirePermission("clients:write");
    const parsed = clientInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Dados do cliente inválidos.",
      };
    }

    const created = await createClient({
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      input: parsed.data,
    });

    revalidatePath("/app/clientes");
    return { success: true, data: { id: created.id } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Erro ao cadastrar cliente.",
    };
  }
}

export async function updateClientAction(
  clientId: string,
  rawInput: unknown
): Promise<ActionResult> {
  try {
    const ctx = await requirePermission("clients:write");
    const parsed = clientInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Dados do cliente inválidos.",
      };
    }

    await updateClient({
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      clientId,
      input: parsed.data,
    });

    revalidatePath("/app/clientes");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Erro ao atualizar cliente.",
    };
  }
}

export async function deleteClientAction(
  clientId: string
): Promise<ActionResult> {
  try {
    const ctx = await requirePermission("clients:delete");
    await deleteClient({
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      clientId,
    });

    revalidatePath("/app/clientes");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Erro ao remover cliente.",
    };
  }
}

