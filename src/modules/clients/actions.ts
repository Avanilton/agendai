"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/tenant/context";
import { hasPermission } from "@/lib/permissions/evaluator";
import type { ActionResult } from "@/modules/organizations/actions";
import { clientInputSchema } from "./schemas";
import { createClient, deleteClient, updateClient } from "./service";
import {
  createClientAttachment,
  deleteClientAttachment,
  getClientFullProfile,
  type ClientFullProfile,
} from "./profile-service";
import { z } from "zod";

const clientAttachmentInputSchema = z.object({
  clientId: z.string().uuid("Cliente inválido."),
  title: z.string().trim().min(2, "Informe um título para o anexo.").max(160),
  fileName: z.string().trim().min(1).max(200),
  mimeType: z.string().trim().min(1).max(120),
  sizeBytes: z.coerce.number().int().min(1).max(6 * 1024 * 1024, "Arquivo excede o limite de 6 MB."),
  dataUrl: z.string().min(10).max(8 * 1024 * 1024),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  channel: z.enum(["whatsapp", "email", "presencial", "outro"]).default("whatsapp"),
});

export async function uploadClientAttachmentAction(
  rawInput: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await requirePermission("clients:write");
    const parsed = clientAttachmentInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Dados do anexo inválidos.",
      };
    }

    const created = await createClientAttachment({
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      clientId: parsed.data.clientId,
      title: parsed.data.title,
      fileName: parsed.data.fileName,
      mimeType: parsed.data.mimeType,
      sizeBytes: parsed.data.sizeBytes,
      dataUrl: parsed.data.dataUrl,
      notes: parsed.data.notes,
      channel: parsed.data.channel,
    });

    revalidatePath(`/app/clientes/${parsed.data.clientId}`);
    return { success: true, data: { id: created.id } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Erro ao salvar anexo.",
    };
  }
}

export async function deleteClientAttachmentAction(
  attachmentId: string
): Promise<ActionResult> {
  try {
    const ctx = await requirePermission("clients:write");
    const clientId = await deleteClientAttachment({
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      attachmentId,
    });

    revalidatePath(`/app/clientes/${clientId}`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Erro ao remover anexo.",
    };
  }
}

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

