"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/tenant/context";
import type { ActionResult } from "@/modules/organizations/actions";
import { professionalInputSchema } from "./schemas";
import {
  createProfessional,
  deleteProfessional,
  updateProfessional,
} from "./service";

export async function createProfessionalAction(
  rawInput: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await requirePermission("team:manage");
    const parsed = professionalInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ?? "Dados do profissional inválidos.",
      };
    }

    const created = await createProfessional({
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      input: parsed.data,
    });

    revalidatePath("/app/profissionais");
    return { success: true, data: { id: created.id } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro ao cadastrar profissional.",
    };
  }
}

export async function updateProfessionalAction(
  professionalId: string,
  rawInput: unknown
): Promise<ActionResult> {
  try {
    const ctx = await requirePermission("team:manage");
    const parsed = professionalInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ?? "Dados do profissional inválidos.",
      };
    }

    await updateProfessional({
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      professionalId,
      input: parsed.data,
    });

    revalidatePath("/app/profissionais");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro ao atualizar profissional.",
    };
  }
}

export async function deleteProfessionalAction(
  professionalId: string
): Promise<ActionResult> {
  try {
    const ctx = await requirePermission("team:manage");
    await deleteProfessional({
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      professionalId,
    });

    revalidatePath("/app/profissionais");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro ao remover profissional.",
    };
  }
}

