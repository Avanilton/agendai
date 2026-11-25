"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import {
  getAuthenticatedSession,
  requirePermission,
} from "@/lib/tenant/context";
import {
  onboardingOrganizationSchema,
  updateOrganizationSchema,
} from "./schemas";
import {
  createOrganizationForUser,
  recordUserConsents,
  updateOrganization,
} from "./service";

export interface ActionResult<T = undefined> {
  success: boolean;
  error?: string;
  data?: T;
}

export async function completeOnboardingAction(
  rawInput: unknown
): Promise<ActionResult<{ organizationId: string; slug: string }>> {
  const sessionData = await getAuthenticatedSession();
  if (!sessionData?.user || !sessionData?.session) {
    return {
      success: false,
      error: "Sessão expirada. Faça login novamente para continuar.",
    };
  }

  const parsed = onboardingOrganizationSchema.safeParse(rawInput);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return {
      success: false,
      error: firstIssue?.message ?? "Dados inválidos. Revise os campos.",
    };
  }

  const reqHeaders = await headers();
  const ipAddress =
    reqHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = reqHeaders.get("user-agent") ?? null;

  try {
    const org = await createOrganizationForUser({
      userId: sessionData.user.id,
      sessionId: sessionData.session.id,
      input: parsed.data,
      ipAddress,
      userAgent,
    });

    await recordUserConsents({
      userId: sessionData.user.id,
      organizationId: org.id,
      ipAddress,
      userAgent,
    });

    return {
      success: true,
      data: {
        organizationId: org.id,
        slug: org.slug,
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro ao criar empresa. Tente novamente.",
    };
  }
}

export async function updateOrganizationAction(
  rawInput: unknown
): Promise<ActionResult> {
  try {
    const ctx = await requirePermission("settings:manage");
    const parsed = updateOrganizationSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ?? "Dados da empresa inválidos.",
      };
    }

    await updateOrganization({
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      input: parsed.data,
    });

    revalidatePath("/app");
    revalidatePath("/app/empresa");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro ao atualizar dados da empresa.",
    };
  }
}

