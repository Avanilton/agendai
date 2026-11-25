"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/tenant/context";
import type { ActionResult } from "@/modules/organizations/actions";
import { bookingSettingsSchema } from "./schemas";
import { saveBookingSettings } from "./service";

export async function saveBookingSettingsAction(
  rawInput: unknown
): Promise<ActionResult> {
  try {
    const ctx = await requirePermission("appointments:write");
    const parsed = bookingSettingsSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ??
          "Configurações de agendamento online inválidas.",
      };
    }

    await saveBookingSettings({
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      input: parsed.data,
    });

    revalidatePath("/app/agenda/disponibilidade");
    revalidatePath(`/agendar/${ctx.organizationSlug}`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro ao salvar configurações de agendamento online.",
    };
  }
}

