"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { requireTenantContext } from "@/lib/tenant/context";
import { ALLOWED_HOME_ROUTES } from "./constants";

const updateProfileSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome completo.").max(120),
  image: z
    .string()
    .trim()
    .max(300_000, "A imagem selecionada é muito grande (máx. ~200 KB).")
    .optional()
    .nullable()
    .refine(
      (val) => {
        if (!val) return true;
        return (
          val.startsWith("preset:") ||
          val.startsWith("https://") ||
          val.startsWith("http://") ||
          val.startsWith("data:image/")
        );
      },
      { message: "Formato de avatar inválido." }
    ),
});

const updatePreferencesSchema = z.object({
  theme: z.enum(["light", "dark"]),
  defaultHomeRoute: z
    .string()
    .refine((val) => ALLOWED_HOME_ROUTES.includes(val), {
      message: "Tela inicial inválida.",
    }),
});

export async function updateUserProfileAction(input: {
  name: string;
  image?: string | null;
}) {
  try {
    const ctx = await requireTenantContext();
    const parsed = updateProfileSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false as const,
        error: parsed.error.issues[0]?.message || "Dados inválidos.",
      };
    }

    const db = getDb();
    await db
      .update(users)
      .set({
        name: parsed.data.name,
        image: parsed.data.image || null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, ctx.userId));

    revalidatePath("/app", "layout");
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar o perfil.",
    };
  }
}

export async function updateUserPreferencesAction(input: {
  theme: "light" | "dark";
  defaultHomeRoute: string;
}) {
  try {
    const ctx = await requireTenantContext();
    const parsed = updatePreferencesSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false as const,
        error: parsed.error.issues[0]?.message || "Preferências inválidas.",
      };
    }

    const db = getDb();
    await db
      .update(users)
      .set({
        theme: parsed.data.theme,
        defaultHomeRoute: parsed.data.defaultHomeRoute,
        updatedAt: new Date(),
      })
      .where(eq(users.id, ctx.userId));

    revalidatePath("/app", "layout");
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error
          ? error.message
          : "Não foi possível salvar preferências.",
    };
  }
}

