import { describe, it, expect } from "vitest";
import {
  calculatePurchaseTotals,
  calculateSaleTotals,
  computeStockAfterMovement,
} from "@/modules/commerce/calculations";
import {
  createPurchaseSchema,
  createSaleSchema,
  manualMovementSchema,
} from "@/modules/commerce/schemas";

describe("Commerce & Inventory Calculations", () => {
  it("calculates sale and purchase totals in integer cents accurately", () => {
    expect(
      calculateSaleTotals(
        [
          { quantity: 2, unitCents: 5000 },
          { quantity: 1, unitCents: 12000 },
        ],
        2000
      )
    ).toEqual({ subtotalCents: 22000, totalCents: 20000 });

    expect(
      calculatePurchaseTotals(
        [{ quantity: 10, unitCents: 1500 }],
        1000,
        500
      )
    ).toEqual({ subtotalCents: 15000, totalCents: 14500 });
  });

  it("computes traceable stock deltas and prevents negative stock", () => {
    expect(
      computeStockAfterMovement({ currentStock: 10, type: "in", quantity: 5 })
    ).toEqual({ previousQuantity: 10, quantityDelta: 5, newQuantity: 15 });

    expect(
      computeStockAfterMovement({ currentStock: 10, type: "out", quantity: 4 })
    ).toEqual({ previousQuantity: 10, quantityDelta: -4, newQuantity: 6 });

    expect(
      computeStockAfterMovement({
        currentStock: 10,
        type: "adjustment",
        quantity: 7,
      })
    ).toEqual({ previousQuantity: 10, quantityDelta: -3, newQuantity: 7 });

    expect(() =>
      computeStockAfterMovement({ currentStock: 3, type: "out", quantity: 5 })
    ).toThrow(/Estoque insuficiente/);
  });

  it("validates sale, purchase, and traceable movement schemas", () => {
    const uuid = "11111111-1111-4111-8111-111111111111";

    expect(
      createSaleSchema.safeParse({
        accountId: uuid,
        items: [{ itemType: "product", itemId: uuid, quantity: 2, unitPriceReais: 45 }],
      }).success
    ).toBe(true);

    expect(
      createPurchaseSchema.safeParse({
        supplierId: uuid,
        accountId: uuid,
        items: [{ productId: uuid, quantity: 5, unitCostReais: 20 }],
      }).success
    ).toBe(true);

    expect(
      manualMovementSchema.safeParse({
        productId: uuid,
        type: "out",
        quantity: 1,
        reason: "", // reason is mandatory for traceability
      }).success
    ).toBe(false);
  });
});

