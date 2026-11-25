import { describe, it, expect } from "vitest";
import { evaluatePackageHealth } from "@/modules/packages-budgets/logic";
import {
  createBudgetSchema,
  createPackageSchema,
} from "@/modules/packages-budgets/schemas";

describe("Packages Health & Expiration Engine", () => {
  it("flags low sessions and expiring-soon packages accurately", () => {
    const health = evaluatePackageHealth(
      {
        totalSessions: 10,
        usedSessions: 8,
        expiresAt: "2026-12-05",
        status: "active",
      },
      "2026-11-25"
    );

    expect(health.remainingSessions).toBe(2);
    expect(health.isLowSessions).toBe(true);
    expect(health.isExpiringSoon).toBe(true);
    expect(health.isExpired).toBe(false);
    expect(health.canConsumeSession).toBe(true);
  });

  it("blocks session consumption when expired or exhausted", () => {
    const expired = evaluatePackageHealth(
      {
        totalSessions: 5,
        usedSessions: 1,
        expiresAt: "2026-11-20",
        status: "active",
      },
      "2026-11-25"
    );
    expect(expired.isExpired).toBe(true);
    expect(expired.canConsumeSession).toBe(false);

    const exhausted = evaluatePackageHealth(
      {
        totalSessions: 5,
        usedSessions: 5,
        expiresAt: null,
        status: "active",
      },
      "2026-11-25"
    );
    expect(exhausted.remainingSessions).toBe(0);
    expect(exhausted.canConsumeSession).toBe(false);
  });

  it("validates package and budget Zod schemas", () => {
    const uuid = "11111111-1111-4111-8111-111111111111";

    expect(
      createPackageSchema.safeParse({
        clientId: uuid,
        name: "10 Sessões de Fisioterapia",
        totalSessions: 10,
        priceReais: 1200,
      }).success
    ).toBe(true);

    expect(
      createBudgetSchema.safeParse({
        clientId: uuid,
        title: "Plano Estético Verão",
        items: [
          { itemType: "service", itemId: uuid, quantity: 3, unitPriceReais: 150 },
        ],
      }).success
    ).toBe(true);
  });
});

