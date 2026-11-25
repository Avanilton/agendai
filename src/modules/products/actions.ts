"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/tenant/context";
import type { ActionResult } from "@/modules/organizations/actions";
import { productInputSchema } from "./schemas";
import { createProduct, deleteProduct, updateProduct } from "./service";

export async function createProductAction(
  rawInput: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await requirePermission("inventory:write");
    const parsed = productInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Dados do produto inválidos.",
      };
    }

    const created = await createProduct({
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      input: parsed.data,
    });

    revalidatePath("/app/produtos");
    return { success: true, data: { id: created.id } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Erro ao cadastrar produto.",
    };
  }
}

export async function updateProductAction(
  productId: string,
  rawInput: unknown
): Promise<ActionResult> {
  try {
    const ctx = await requirePermission("inventory:write");
    const parsed = productInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Dados do produto inválidos.",
      };
    }

    await updateProduct({
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      productId,
      input: parsed.data,
    });

    revalidatePath("/app/produtos");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Erro ao atualizar produto.",
    };
  }
}

export async function deleteProductAction(
  productId: string
): Promise<ActionResult> {
  try {
    const ctx = await requirePermission("inventory:write");
    await deleteProduct({
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      productId,
    });

    revalidatePath("/app/produtos");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Erro ao remover produto.",
    };
  }
}

