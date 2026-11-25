import { describe, it, expect } from "vitest";
import {
  calculateMarginPercent,
  canAddActiveProfessional,
} from "@/lib/plans/limits";
import { clientInputSchema } from "@/modules/clients/schemas";
import { professionalInputSchema } from "@/modules/professionals/schemas";
import { serviceInputSchema } from "@/modules/services/schemas";
import { productInputSchema } from "@/modules/products/schemas";
import { supplierInputSchema } from "@/modules/suppliers/schemas";
import { updateOrganizationSchema } from "@/modules/organizations/schemas";

describe("Plan Limits & Product Margin Calculations", () => {
  it("enforces professional seat limits per plan", () => {
    expect(canAddActiveProfessional(0, 1)).toBe(true);
    expect(canAddActiveProfessional(1, 1)).toBe(false);
    expect(canAddActiveProfessional(2, 3)).toBe(true);
    expect(canAddActiveProfessional(3, 3)).toBe(false);
    expect(canAddActiveProfessional(5, 5)).toBe(false);
    expect(canAddActiveProfessional(9, 10)).toBe(true);
  });

  it("calculates product profit margin accurately", () => {
    expect(calculateMarginPercent(5000, 10000)).toBe(50);
    expect(calculateMarginPercent(7500, 10000)).toBe(25);
    expect(calculateMarginPercent(5000, 0)).toBe(0);
  });
});

describe("Phase 2 Cadastros Zod Validation", () => {
  it("validates client schema and rejects invalid email", () => {
    expect(
      clientInputSchema.safeParse({
        name: "Maria Silva",
        email: "maria@exemplo.com",
        tags: ["VIP"],
      }).success
    ).toBe(true);

    expect(
      clientInputSchema.safeParse({
        name: "Maria Silva",
        email: "email-invalido",
      }).success
    ).toBe(false);
  });

  it("validates professional schema with commission bounds", () => {
    expect(
      professionalInputSchema.safeParse({
        name: "Dr. Lucas Andrade",
        defaultCommissionPercent: 35,
        salaryReais: 3500,
        remunerationType: "hybrid",
      }).success
    ).toBe(true);

    expect(
      professionalInputSchema.safeParse({
        name: "Dr. Lucas",
        defaultCommissionPercent: 150,
      }).success
    ).toBe(false);
  });

  it("validates service, supplier, product, and organization schemas", () => {
    expect(
      serviceInputSchema.safeParse({
        name: "Consulta Inicial",
        priceReais: 180,
        durationMinutes: 45,
        bufferMinutes: 10,
      }).success
    ).toBe(true);

    expect(
      serviceInputSchema.safeParse({
        name: "Rápido",
        priceReais: 50,
        durationMinutes: 2, // min 5
      }).success
    ).toBe(false);

    expect(
      supplierInputSchema.safeParse({
        name: "Distribuidora Saúde Brasil",
        document: "12.345.678/0001-99",
      }).success
    ).toBe(true);

    expect(
      productInputSchema.safeParse({
        name: "Sérum Facial 30ml",
        costReais: 45,
        priceReais: 120,
        stockQuantity: 15,
        minStockQuantity: 5,
      }).success
    ).toBe(true);

    expect(
      updateOrganizationSchema.safeParse({
        name: "Clínica Vida",
        slug: "clinica-vida",
        segment: "Clínica Médica",
        timezone: "America/Sao_Paulo",
      }).success
    ).toBe(true);
  });
});

