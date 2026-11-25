import { describe, it, expect } from "vitest";
import { calculateServicePricing } from "@/modules/reports/pricing";
import {
  escapeCsvCell,
  parseClientsCsvPreview,
  toCsvString,
} from "@/modules/reports/csv";

describe("Pricing Calculator Engine", () => {
  it("computes minimum break-even and recommended price accurately", () => {
    const out = calculateServicePricing({
      materialCostReais: 20,
      durationMinutes: 60,
      hourlyLaborCostReais: 50,
      monthlyFixedCostsReais: 3200,
      monthlyBillableHours: 160, // R$20/h fixed allocation
      variableCostReais: 10,
      taxPercent: 10,
      commissionPercent: 20,
      paymentFeePercent: 0,
      desiredMarginPercent: 20,
    });

    // Total cost = 20 + 50 + 20 + 10 = 100
    // Deductions = 30%, minPrice = 100 / 0.70 = 142.86
    // Recommended = 100 / 0.50 = 200.00, profit = 40.00 (20%)
    expect(out.isFeasible).toBe(true);
    expect(out.totalCostReais).toBe(100);
    expect(out.minimumPriceReais).toBe(142.86);
    expect(out.recommendedPriceReais).toBe(200);
    expect(out.estimatedProfitReais).toBe(40);
    expect(out.realMarginPercent).toBe(20);
  });

  it("flags infeasible pricing when deductions + margin >= 100%", () => {
    const out = calculateServicePricing({
      materialCostReais: 10,
      durationMinutes: 30,
      hourlyLaborCostReais: 40,
      monthlyFixedCostsReais: 0,
      monthlyBillableHours: 100,
      variableCostReais: 0,
      taxPercent: 40,
      commissionPercent: 40,
      paymentFeePercent: 10,
      desiredMarginPercent: 20,
    });

    expect(out.isFeasible).toBe(false);
  });
});

describe("CSV Security & Client Import Parser", () => {
  it("neutralizes CSV formula injection payloads (=, +, -, @)", () => {
    expect(escapeCsvCell("=CMD|' /C calc'!A0")).toBe("'=CMD|' /C calc'!A0");
    expect(escapeCsvCell("+1234")).toBe("'+1234");
    expect(escapeCsvCell("@SUM(A1:A2)")).toBe("'@SUM(A1:A2)");

    const csv = toCsvString(["Nome", "Valor"], [["Ana;Maria", "100.00"]]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"Ana;Maria";100.00');
  });

  it("validates CSV client rows and flags invalid emails and duplicates", () => {
    const rows = parseClientsCsvPreview(
      [
        "nome;telefone;email",
        "Maria Silva;11999991111;maria@teste.com",
        "A;11999992222;invalido",
        "Maria Duplicada;11999993333;maria@teste.com",
      ].join("\n")
    );

    expect(rows).toHaveLength(3);
    expect(rows[0]?.valid).toBe(true);
    expect(rows[1]?.valid).toBe(false);
    expect(rows[2]?.valid).toBe(false);
    expect(rows[2]?.error).toContain("duplicado");
  });
});

