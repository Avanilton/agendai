"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  fiscalProfiles,
  organizations,
  plans,
  serviceInvoices,
  subscriptions,
} from "@/db/schema";
import {
  requirePermission,
  requirePlatformAdmin,
} from "@/lib/tenant/context";
import { logAudit } from "@/lib/security/audit";
import type { ActionResult } from "@/modules/organizations/actions";
import {
  createNfseDraftSchema,
  createPixChargeSchema,
  fiscalProfileSchema,
} from "./schemas";
import { createPixCharge, markPixChargePaid } from "./service";

export async function createPixChargeAction(
  rawInput: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await requirePermission("financial:write");
    const parsed = createPixChargeSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Dados do Pix inválidos.",
      };
    }

    const created = await createPixCharge({
      organizationId: ctx.organizationId,
      organizationName: ctx.organizationName,
      actorUserId: ctx.userId,
      clientId: parsed.data.clientId || undefined,
      pixKey: parsed.data.pixKey,
      amountReais: parsed.data.amountReais,
      description: parsed.data.description,
    });

    revalidatePath("/app/integracoes");
    return { success: true, data: { id: created.id } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Erro ao gerar cobrança Pix.",
    };
  }
}

export async function markPixChargePaidAction(
  chargeId: string
): Promise<ActionResult> {
  try {
    const ctx = await requirePermission("financial:write");
    await markPixChargePaid({
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      chargeId,
    });
    revalidatePath("/app/integracoes");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Erro ao confirmar Pix.",
    };
  }
}

export async function saveFiscalProfileAction(
  rawInput: unknown
): Promise<ActionResult> {
  try {
    const ctx = await requirePermission("settings:manage");
    const parsed = fiscalProfileSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Dados fiscais inválidos.",
      };
    }

    const db = getDb();
    const isConfigured = Boolean(
      parsed.data.cnpj && parsed.data.municipalRegistration
    );

    await db
      .insert(fiscalProfiles)
      .values({
        organizationId: ctx.organizationId,
        cnpj: parsed.data.cnpj || null,
        municipalRegistration: parsed.data.municipalRegistration || null,
        taxRegime: parsed.data.taxRegime,
        defaultServiceCode: parsed.data.defaultServiceCode || null,
        issRateBps: Math.round(parsed.data.issRatePercent * 100),
        provider: parsed.data.provider,
        environment: parsed.data.environment,
        isConfigured,
      })
      .onConflictDoUpdate({
        target: fiscalProfiles.organizationId,
        set: {
          cnpj: parsed.data.cnpj || null,
          municipalRegistration: parsed.data.municipalRegistration || null,
          taxRegime: parsed.data.taxRegime,
          defaultServiceCode: parsed.data.defaultServiceCode || null,
          issRateBps: Math.round(parsed.data.issRatePercent * 100),
          provider: parsed.data.provider,
          environment: parsed.data.environment,
          isConfigured,
          updatedAt: new Date(),
        },
      });

    await logAudit({
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      action: "fiscal_profile.updated",
      resourceType: "fiscal_profile",
      resourceId: ctx.organizationId,
      metadata: { taxRegime: parsed.data.taxRegime, provider: parsed.data.provider },
    });

    revalidatePath("/app/integracoes");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro ao salvar configuração fiscal.",
    };
  }
}

export async function createNfseDraftAction(
  rawInput: unknown
): Promise<ActionResult> {
  try {
    const ctx = await requirePermission("financial:write");
    const parsed = createNfseDraftSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Dados da NFS-e inválidos.",
      };
    }

    const db = getDb();
    await db.insert(serviceInvoices).values({
      organizationId: ctx.organizationId,
      clientId: parsed.data.clientId || null,
      serviceCode: parsed.data.serviceCode || null,
      description: parsed.data.description,
      amountCents: Math.round(parsed.data.amountReais * 100),
      issRateBps: Math.round(parsed.data.issRatePercent * 100),
      status: "draft",
      createdByUserId: ctx.userId,
    });

    revalidatePath("/app/integracoes");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro ao preparar rascunho de NFS-e.",
    };
  }
}

export async function adminToggleOrganizationStatusAction(
  organizationId: string,
  nextStatus: "active" | "suspended"
): Promise<ActionResult> {
  try {
    const admin = await requirePlatformAdmin();
    const db = getDb();

    await db
      .update(organizations)
      .set({ status: nextStatus, updatedAt: new Date() })
      .where(eq(organizations.id, organizationId));

    await logAudit({
      organizationId,
      actorUserId: admin.id,
      action: `platform_admin.org_${nextStatus}`,
      resourceType: "organization",
      resourceId: organizationId,
    });

    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro ao alterar status da organização.",
    };
  }
}

export async function adminChangeOrganizationPlanAction(
  organizationId: string,
  planId: string
): Promise<ActionResult> {
  try {
    const admin = await requirePlatformAdmin();
    const db = getDb();

    const [targetPlan] = await db
      .select({ id: plans.id, name: plans.name, slug: plans.slug })
      .from(plans)
      .where(eq(plans.id, planId))
      .limit(1);

    if (!targetPlan) {
      return { success: false, error: "Plano selecionado não encontrado." };
    }

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);

    const [existingSub] = await db
      .select({ id: subscriptions.id })
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, organizationId))
      .limit(1);

    if (existingSub) {
      await db
        .update(subscriptions)
        .set({
          planId: targetPlan.id,
          status: "active",
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          updatedAt: now,
        })
        .where(eq(subscriptions.id, existingSub.id));
    } else {
      await db.insert(subscriptions).values({
        organizationId,
        planId: targetPlan.id,
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      });
    }

    await db
      .update(organizations)
      .set({ status: "active", updatedAt: now })
      .where(eq(organizations.id, organizationId));

    await logAudit({
      organizationId,
      actorUserId: admin.id,
      action: "platform_admin.org_plan_changed",
      resourceType: "subscription",
      resourceId: organizationId,
      metadata: { planSlug: targetPlan.slug, planName: targetPlan.name },
    });

    revalidatePath("/admin");
    revalidatePath("/app", "layout");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro ao alterar plano da organização.",
    };
  }
}

