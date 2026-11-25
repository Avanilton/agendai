import { describe, it, expect } from "vitest";
import {
  createClientRecordSchema,
  createRecordTemplateSchema,
  validateRequiredAnswers,
} from "@/modules/records/schemas";

describe("Sensitive Records & Anamnesis Validation", () => {
  it("validates required answers across text and boolean fields", () => {
    const fields = [
      { id: "queixa", label: "Queixa principal", type: "textarea", required: true },
      { id: "alergia", label: "Alergias", type: "text", required: false },
      { id: "consent", label: "Termo assinado", type: "boolean", required: true },
    ];

    expect(
      validateRequiredAnswers(fields, {
        queixa: "Dor lombar",
        consent: true,
      })
    ).toEqual({ valid: true, missingLabels: [] });

    const missing = validateRequiredAnswers(fields, {
      queixa: "   ",
      alergia: "Nenhuma",
    });
    expect(missing.valid).toBe(false);
    expect(missing.missingLabels).toEqual(["Queixa principal", "Termo assinado"]);
  });

  it("validates template and client record Zod schemas", () => {
    const uuid = "11111111-1111-4111-8111-111111111111";

    expect(
      createRecordTemplateSchema.safeParse({
        name: "Ficha Odontológica",
        category: "dental",
        fields: [{ id: "f1", label: "Histórico", type: "textarea", required: true }],
      }).success
    ).toBe(true);

    expect(
      createRecordTemplateSchema.safeParse({
        name: "Vazia",
        category: "dental",
        fields: [],
      }).success
    ).toBe(false);

    expect(
      createClientRecordSchema.safeParse({
        clientId: uuid,
        templateId: uuid,
        answers: { f1: "Paciente estável" },
      }).success
    ).toBe(true);
  });
});

