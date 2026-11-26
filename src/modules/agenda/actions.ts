"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/tenant/context";
import { hasPermission } from "@/lib/permissions/evaluator";
import type { ActionResult } from "@/modules/organizations/actions";
import {
  appointmentInputSchema,
  saveAvailabilitySchema,
  scheduleBlockInputSchema,
  updateAppointmentStatusSchema,
} from "./schemas";
import {
  createOrUpdateAppointment,
  createScheduleBlock,
  deleteAppointmentsBulk,
  deleteScheduleBlock,
  saveAvailabilityRules,
  updateAppointmentStatus,
} from "./service";

export async function createAppointmentAction(
  rawInput: unknown
): Promise<ActionResult<{ id: string; createdCount?: number; skippedCount?: number }>> {
  try {
    const ctx = await requirePermission("appointments:write");
    const parsed = appointmentInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Dados do agendamento inválidos.",
      };
    }

    const result = await createOrUpdateAppointment({
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      canOverbook: hasPermission(ctx.permissions, "appointments:overbook"),
      input: parsed.data,
    });

    revalidatePath("/app/agenda");
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Erro ao criar agendamento.",
    };
  }
}

export async function updateAppointmentAction(
  appointmentId: string,
  rawInput: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await requirePermission("appointments:write");
    const parsed = appointmentInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Dados do agendamento inválidos.",
      };
    }

    const result = await createOrUpdateAppointment({
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      canOverbook: hasPermission(ctx.permissions, "appointments:overbook"),
      appointmentId,
      input: parsed.data,
    });

    revalidatePath("/app/agenda");
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Erro ao atualizar agendamento.",
    };
  }
}

export async function updateAppointmentStatusAction(
  appointmentId: string,
  rawInput: unknown
): Promise<ActionResult> {
  try {
    const parsed = updateAppointmentStatusSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Status inválido.",
      };
    }

    const requiredPerm =
      parsed.data.status === "cancelled"
        ? "appointments:delete"
        : "appointments:write";
    const ctx = await requirePermission(requiredPerm);

    await updateAppointmentStatus({
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      appointmentId,
      status: parsed.data.status,
      cancellationReason: parsed.data.cancellationReason,
    });

    revalidatePath("/app/agenda");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Erro ao alterar status.",
    };
  }
}

export async function deleteAppointmentsBulkAction(
  appointmentIds: string[],
  clientId?: string
): Promise<ActionResult<{ deletedCount: number }>> {
  try {
    const ctx = await requirePermission("appointments:delete");
    const ids = Array.isArray(appointmentIds)
      ? appointmentIds.filter((id) => typeof id === "string" && id.length > 0)
      : [];

    if (ids.length === 0) {
      return {
        success: false,
        error: "Selecione ao menos um agendamento para excluir.",
      };
    }

    const result = await deleteAppointmentsBulk({
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      appointmentIds: ids,
    });

    revalidatePath("/app/agenda");
    if (clientId) {
      revalidatePath(`/app/clientes/${clientId}`);
    }
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro ao excluir agendamentos.",
    };
  }
}

export async function saveAvailabilityAction(
  rawInput: unknown
): Promise<ActionResult> {
  try {
    const ctx = await requirePermission("appointments:write");
    const parsed = saveAvailabilitySchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ?? "Configuração de horários inválida.",
      };
    }

    await saveAvailabilityRules({
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      professionalId: parsed.data.professionalId || null,
      rules: parsed.data.rules,
    });

    revalidatePath("/app/agenda/disponibilidade");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro ao salvar disponibilidade.",
    };
  }
}

export async function createScheduleBlockAction(
  rawInput: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await requirePermission("appointments:write");
    const parsed = scheduleBlockInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Dados do bloqueio inválidos.",
      };
    }

    const created = await createScheduleBlock({
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      input: parsed.data,
    });

    revalidatePath("/app/agenda");
    revalidatePath("/app/agenda/disponibilidade");
    return { success: true, data: { id: created.id } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Erro ao criar bloqueio.",
    };
  }
}

export async function deleteScheduleBlockAction(
  blockId: string
): Promise<ActionResult> {
  try {
    const ctx = await requirePermission("appointments:write");
    await deleteScheduleBlock({
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      blockId,
    });

    revalidatePath("/app/agenda");
    revalidatePath("/app/agenda/disponibilidade");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Erro ao remover bloqueio.",
    };
  }
}

