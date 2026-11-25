import { describe, it, expect } from "vitest";
import {
  buildInstallments,
  calculateNetAmountCents,
  summarizeFinancialMetrics,
} from "@/modules/financial/calculations";
import { transactionInputSchema } from "@/modules/financial/schemas";

describe("Financial Calculations Engine (Integer Cents)", () => {
  it("calculates net amount with discount, interest, and fine safely", () => {
    expect(
      calculateNetAmountCents({
        amountCents: 10000,
        discountCents: 1000,
        interestCents: 250,
        fineCents: 150,
      })
    ).toBe(9400);

    expect(
      calculateNetAmountCents({
        amountCents: 500,
        discountCents: 2000,
      })
    ).toBe(0);
  });

  it("splits installments with ZERO cent loss and clamps month-end dates", () => {
    const parts = buildInstallments(10000, 3, "2026-01-31");
    expect(parts).toHaveLength(3);
    expect(parts.map((p) => p.amountCents)).toEqual([3334, 3333, 3333]);
    expect(parts.reduce((acc, p) => acc + p.amountCents, 0)).toBe(10000);
    expect(parts.map((p) => p.dueDate)).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
    ]);
  });

  it("summarizes income, expense, profit, overdue, and average ticket accurately", () => {
    const summary = summarizeFinancialMetrics(
      [
        {
          type: "income",
          status: "paid",
          amountCents: 20000,
          discountCents: 0,
          interestCents: 0,
          fineCents: 0,
          paidAmountCents: 20000,
          dueDate: "2026-11-20",
        },
        {
          type: "income",
          status: "partial",
          amountCents: 10000,
          discountCents: 0,
          interestCents: 0,
          fineCents: 0,
          paidAmountCents: 4000,
          dueDate: "2026-11-10", // overdue
        },
        {
          type: "expense",
          status: "paid",
          amountCents: 9000,
          discountCents: 0,
          interestCents: 0,
          fineCents: 0,
          paidAmountCents: 9000,
          dueDate: "2026-11-15",
        },
        {
          type: "transfer",
          status: "paid",
          amountCents: 50000,
          discountCents: 0,
          interestCents: 0,
          fineCents: 0,
          paidAmountCents: 50000,
          dueDate: "2026-11-21",
        },
      ],
      "2026-11-25"
    );

    expect(summary.totalIncomeReceivedCents).toBe(24000);
    expect(summary.totalExpensePaidCents).toBe(9000);
    expect(summary.netProfitCents).toBe(15000);
    expect(summary.receivablePendingCents).toBe(6000);
    expect(summary.overdueCount).toBe(1);
    expect(summary.overdueCents).toBe(6000);
    expect(summary.averageTicketCents).toBe(12000);
  });

  it("validates financial transaction Zod schema", () => {
    const uuid = "11111111-1111-4111-8111-111111111111";
    expect(
      transactionInputSchema.safeParse({
        type: "income",
        description: "Consulta Dermatológica",
        amountReais: 250,
        paymentMethod: "pix",
        dueDate: "2026-11-25",
        accountId: uuid,
        installments: 3,
      }).success
    ).toBe(true);

    expect(
      transactionInputSchema.safeParse({
        type: "expense",
        description: "Aluguel",
        amountReais: -10,
        dueDate: "2026-11-25",
        accountId: uuid,
      }).success
    ).toBe(false);
  });
});

