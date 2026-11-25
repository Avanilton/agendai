import { describe, it, expect } from "vitest";
import {
  calculateCommissionCents,
  computeGoalProgressPercent,
  summarizeCommissions,
} from "@/modules/team/calculations";
import {
  createCommissionSchema,
  createGoalSchema,
  createTimeEntrySchema,
} from "@/modules/team/schemas";

describe("Team & Commissions Engine", () => {
  it("calculates percentage and fixed commissions in integer cents", () => {
    expect(
      calculateCommissionCents({
        calcType: "percentage",
        baseAmountCents: 25000,
        rateBps: 3000, // 30%
      })
    ).toBe(7500);

    expect(
      calculateCommissionCents({
        calcType: "fixed",
        baseAmountCents: 0,
        fixedAmountCents: 4500,
      })
    ).toBe(4500);
  });

  it("summarizes pending and paid commissions ignoring cancelled ones", () => {
    const summary = summarizeCommissions([
      { status: "pending", commissionAmountCents: 5000 },
      { status: "pending", commissionAmountCents: 2500 },
      { status: "paid", commissionAmountCents: 10000 },
      { status: "cancelled", commissionAmountCents: 9999 },
    ]);

    expect(summary).toEqual({
      pendingCents: 7500,
      paidCents: 10000,
      totalActiveCents: 17500,
      pendingCount: 2,
    });
  });

  it("computes goal progress percent capped at 100%", () => {
    expect(computeGoalProgressPercent(2500, 5000)).toBe(50);
    expect(computeGoalProgressPercent(7000, 5000)).toBe(100);
    expect(computeGoalProgressPercent(100, 0)).toBe(0);
  });

  it("validates commission, time entry, and goal Zod schemas", () => {
    const uuid = "11111111-1111-4111-8111-111111111111";

    expect(
      createCommissionSchema.safeParse({
        professionalId: uuid,
        source: "service",
        calcType: "percentage",
        baseAmountReais: 200,
        ratePercent: 25,
        referenceDate: "2026-11-25",
        description: "Atendimentos da semana",
      }).success
    ).toBe(true);

    expect(
      createTimeEntrySchema.safeParse({
        professionalId: uuid,
        type: "overtime",
        entryDate: "2026-11-25",
        hours: 2.5,
      }).success
    ).toBe(true);

    expect(
      createGoalSchema.safeParse({
        professionalId: uuid,
        monthKey: "2026-11",
        targetRevenueReais: 10000,
        targetAppointments: 50,
      }).success
    ).toBe(true);
  });
});

