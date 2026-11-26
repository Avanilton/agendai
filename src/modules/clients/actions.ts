"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/tenant/context";
import { hasPermission } from "@/lib/permissions/evaluator";
import type { ActionResult } from "@/modules/organizations/actions";
import { clientInputSchema } from "./schemas";
import { createClient, deleteClient, updateClient } from "./service";
import {
  getClientFullProfile,
  type ClientFullProfile,
} from "./profile-service";

export async function getClientProfileAction(
  clientId: string
): Promise<ActionResult<ClientFullProfile>> {
  try {
    const ctx = await requirePermission("clients:read");
    const profile = await getClientFullProfile({
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      clientId,
      canReadAppointments: hasPermission(ctx.permissions, "appointments:read"),
      canReadRecords: hasPermission(ctx.permissions, "medical_records:read"),
      canReadFinancial: hasPermission(ctx.permissions, "financial:read"),
    });
    return { success: true, data: profile };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro ao carregar ficha do cliente.",
    };
  }
}

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
    revalidatePath("/app/agenda");
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
    revalidatePath(`/app/clientes/${clientId}`);
    revalidatePath("/app/agenda");
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
    revalidatePath(`/app/clientes/${clientId}`);
    revalidatePath("/app/agenda");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Erro ao remover cliente.",
    };
  }
}

