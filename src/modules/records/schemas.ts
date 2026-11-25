import { z } from "zod";

export const RECORD_CATEGORIES = [
  "anamnesis",
  "medical",
  "dental",
  "aesthetic",
  "evaluation",
  "photography",
  "attendance",
  "consent",
] as const;

export const recordFieldSchema = z.object({
  id: z.string().trim().min(1).max(60),
  label: z.string().trim().min(2, "Informe o rótulo do campo.").max(160),
  type: z.enum(["text", "textarea", "boolean", "select", "date"]),
  required: z.boolean().default(false),
  options: z.array(z.string().trim().min(1)).optional(),
});

export const createRecordTemplateSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da ficha.").max(120),
  category: z.enum(RECORD_CATEGORIES).default("anamnesis"),
  description: z.string().trim().max(300).optional().or(z.literal("")),
  isSensitive: z.boolean().default(true),
  fields: z
    .array(recordFieldSchema)
    .min(1, "Adicione pelo menos uma pergunta ou campo à ficha."),
});

export type CreateRecordTemplateInput = z.infer<
  typeof createRecordTemplateSchema
>;

export const createClientRecordSchema = z.object({
  clientId: z.string().uuid("Selecione um cliente válido."),
  templateId: z.string().uuid("Selecione um modelo de ficha válido."),
  professionalId: z.string().uuid().optional().or(z.literal("")),
  answers: z.record(z.string(), z.union([z.string(), z.boolean()])),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type CreateClientRecordInput = z.infer<typeof createClientRecordSchema>;

/**
 * Validates that every required field in a template has a non-empty answer.
 */
export function validateRequiredAnswers(
  fields: { id: string; label: string; type: string; required: boolean }[],
  answers: Record<string, string | boolean>
): { valid: boolean; missingLabels: string[] } {
  const missingLabels: string[] = [];

  for (const field of fields) {
    if (!field.required) continue;
    const val = answers[field.id];
    if (field.type === "boolean") {
      if (typeof val !== "boolean") {
        missingLabels.push(field.label);
      }
    } else if (typeof val !== "string" || val.trim().length === 0) {
      missingLabels.push(field.label);
    }
  }

  return { valid: missingLabels.length === 0, missingLabels };
}

