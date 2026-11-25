"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/tenant/context";
import type { ActionResult } from "@/modules/organizations/actions";
import { supplierInputSchema } from "./schemas";
import { createSupplier, deleteSupplier, updateSupplier } from "./service";

export async function createSupplierAction(
  rawInput: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await requirePermission("inventory:write");
    const parsed = supplierInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ?? "Dados do fornecedor inválidos.",
      };
    }

    const created = await createSupplier({
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      input: parsed.data,
    });

    revalidatePath("/app/fornecedores");
    return { success: true, data: { id: created.id } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro ao cadastrar fornecedor.",
    };
  }
}

export async function updateSupplierAction(
  supplierId: string,
  rawInput: unknown
): Promise<ActionResult> {
  try {
    const ctx = await requirePermission("inventory:write");
    const parsed = supplierInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ?? "Dados do fornecedor inválidos.",
      };
    }

    await updateSupplier({
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      supplierId,
      input: parsed.data,
    });

    revalidatePath("/app/fornecedores");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro ao atualizar fornecedor.",
    };
  }
}

export async function deleteSupplierAction(
  supplierId: string
): Promise<ActionResult> {
  try {
    const ctx = await requirePermission("inventory:write");
    await deleteSupplier({
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      supplierId,
    });

    revalidatePath("/app/fornecedores");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Erro ao remover fornecedor.",
    };
  }
}

