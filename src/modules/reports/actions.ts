"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/tenant/context";
import { createClient } from "@/modules/clients/service";
import { parseClientsCsvPreview } from "./csv";
import type { ActionResult } from "@/modules/organizations/actions";

export async function importClientsCsvAction(
  csvText: string
): Promise<ActionResult<{ importedCount: number; skippedCount: number }>> {
  try {
    const ctx = await requirePermission("clients:write");
    const rows = parseClientsCsvPreview(csvText);
    const validRows = rows.filter((r) => r.valid);

    if (validRows.length === 0) {
      return {
        success: false,
        error: "Nenhum registro válido encontrado no CSV para importação.",
      };
    }

    let importedCount = 0;
    let skippedCount = rows.length - validRows.length;

    for (const row of validRows.slice(0, 200)) {
      try {
        await createClient({
          organizationId: ctx.organizationId,
          actorUserId: ctx.userId,
          input: {
            name: row.name,
            phone: row.phone,
            whatsapp: row.phone,
            email: row.email,
            cpf: "",
            birthDate: "",
            address: "",
            notes: "",
            tags: ["Importado CSV"],
            origin: "Importação CSV",
            status: "active",
            whatsappOptIn: true,
            emailOptIn: true,
            lgpdConsent: false,
          },
        });
        importedCount++;
      } catch {
        skippedCount++;
      }
    }

    revalidatePath("/app/clientes");
    revalidatePath("/app/relatorios");
    return { success: true, data: { importedCount, skippedCount } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Erro ao importar arquivo CSV.",
    };
  }
}

