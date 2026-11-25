import { describe, it, expect } from "vitest";
import { sanitizeAuditMetadata } from "@/lib/security/audit";
import { onboardingOrganizationSchema } from "@/modules/organizations/schemas";
import { DEFAULT_PLANS_CATALOG } from "@/db/plans-catalog";
import { formatCurrencyBRL, slugify } from "@/lib/utils";

describe("LGPD Audit Sanitization", () => {
  it("redacts passwords, tokens, CPF, and medical/anamnesis keys recursively", () => {
    const sanitized = sanitizeAuditMetadata({
      actionSource: "onboarding",
      password: "super-secret-password",
      cpf: "123.456.789-00",
      medicalHistory: "Sensitive clinical note",
      nested: {
        anamnesisResult: "Confidential",
        safeField: "ok",
      },
    });

    expect(sanitized.actionSource).toBe("onboarding");
    expect(sanitized.password).toBe("[REDACTED]");
    expect(sanitized.cpf).toBe("[REDACTED]");
    expect(sanitized.medicalHistory).toBe("[REDACTED]");
    expect((sanitized.nested as Record<string, unknown>).anamnesisResult).toBe(
      "[REDACTED]"
    );
    expect((sanitized.nested as Record<string, unknown>).safeField).toBe("ok");
  });
});

describe("Onboarding Schema & Plans Catalog", () => {
  it("validates a well-formed organization onboarding payload", () => {
    const result = onboardingOrganizationSchema.safeParse({
      name: "Clínica Vida Plena",
      slug: "clinica-vida-plena",
      segment: "Clínica Médica",
      phone: "(11) 99999-8888",
      timezone: "America/Sao_Paulo",
      planSlug: "profissional",
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid organization slugs", () => {
    const result = onboardingOrganizationSchema.safeParse({
      name: "Clínica Teste",
      slug: "Clinica Com Espaço!",
      segment: "Clínica Médica",
      planSlug: "individual",
    });

    expect(result.success).toBe(false);
  });

  it("contains all 4 commercial plans with Profissional highlighted", () => {
    expect(DEFAULT_PLANS_CATALOG).toHaveLength(4);
    const popular = DEFAULT_PLANS_CATALOG.filter((p) => p.isPopular);
    expect(popular).toHaveLength(1);
    expect(popular[0]?.slug).toBe("profissional");
    expect(popular[0]?.priceCents).toBe(12990);
  });

  it("formats BRL currency and slugifies Portuguese strings", () => {
    expect(slugify("Clínica São José & Estética!")).toBe("clinica-sao-jose-estetica");
    expect(formatCurrencyBRL(5990)).toContain("59,90");
  });
});

