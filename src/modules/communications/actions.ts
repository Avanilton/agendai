"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/tenant/context";
import type { ActionResult } from "@/modules/organizations/actions";
import { logCommunicationSchema, templateInputSchema } from "./schemas";
import {
  createMessageTemplate,
  deleteMessageTemplate,
  dispatchAndLogCommunication,
  updateMessageTemplate,
} from "./service";

export async function createTemplateAction(
  rawInput: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await requirePermission("communications:manage");
    const parsed = templateInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Dados do template inválidos.",
      };
    }

    const created = await createMessageTemplate({
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      input: parsed.data,
    });

    revalidatePath("/app/comunicacao");
    return { success: true, data: { id: created.id } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Erro ao criar template.",
    };
  }
}

export async function updateTemplateAction(
  templateId: string,
  rawInput: unknown
): Promise<ActionResult> {
  try {
    const ctx = await requirePermission("communications:manage");
    const parsed = templateInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Dados do template inválidos.",
      };
    }

    await updateMessageTemplate({
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      templateId,
      input: parsed.data,
    });

    revalidatePath("/app/comunicacao");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Erro ao atualizar template.",
    };
  }
}

export async function deleteTemplateAction(
  templateId: string
): Promise<ActionResult> {
  try {
    const ctx = await requirePermission("communications:manage");
    await deleteMessageTemplate({
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      templateId,
    });

    revalidatePath("/app/comunicacao");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Erro ao remover template.",
    };
  }
}

export async function sendCommunicationAction(
  rawInput: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await requirePermission("communications:manage");
    const parsed = logCommunicationSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ?? "Dados de comunicação inválidos.",
      };
    }

    const logged = await dispatchAndLogCommunication({
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      input: parsed.data,
    });

    revalidatePath("/app/comunicacao");
    revalidatePath("/app/comunicacao/aniversariantes");
    return { success: true, data: { id: logged.id } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro ao registrar comunicação.",
    };
  }
}

