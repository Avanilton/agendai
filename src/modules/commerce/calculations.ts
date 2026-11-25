export type InventoryMovementType = "in" | "out" | "adjustment" | "return";

export interface PricedLineItem {
  quantity: number;
  unitCents: number;
}

export function calculateSaleTotals(
  items: PricedLineItem[],
  discountCents: number
): { subtotalCents: number; totalCents: number } {
  const subtotalCents = items.reduce(
    (acc, item) => acc + Math.max(0, item.quantity) * Math.max(0, item.unitCents),
    0
  );
  const totalCents = Math.max(0, subtotalCents - Math.max(0, discountCents));
  return { subtotalCents, totalCents };
}

export function calculatePurchaseTotals(
  items: PricedLineItem[],
  discountCents: number,
  taxCents: number
): { subtotalCents: number; totalCents: number } {
  const subtotalCents = items.reduce(
    (acc, item) => acc + Math.max(0, item.quantity) * Math.max(0, item.unitCents),
    0
  );
  const totalCents = Math.max(
    0,
    subtotalCents - Math.max(0, discountCents) + Math.max(0, taxCents)
  );
  return { subtotalCents, totalCents };
}

/**
 * Pure stock transition calculator.
 * For "in" and "return": adds quantity.
 * For "out": subtracts quantity (blocks negative stock).
 * For "adjustment": sets stock directly to target quantity (must be >= 0).
 */
export function computeStockAfterMovement(params: {
  currentStock: number;
  type: InventoryMovementType;
  quantity: number;
}): { previousQuantity: number; quantityDelta: number; newQuantity: number } {
  const { currentStock, type, quantity } = params;
  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new Error("Quantidade inválida para movimentação de estoque.");
  }

  if (type === "in" || type === "return") {
    if (quantity === 0) {
      throw new Error("A quantidade de entrada deve ser maior que zero.");
    }
    return {
      previousQuantity: currentStock,
      quantityDelta: quantity,
      newQuantity: currentStock + quantity,
    };
  }

  if (type === "out") {
    if (quantity === 0) {
      throw new Error("A quantidade de saída deve ser maior que zero.");
    }
    if (currentStock < quantity) {
      throw new Error(
        `Estoque insuficiente (disponível: ${currentStock}, solicitado: ${quantity}).`
      );
    }
    return {
      previousQuantity: currentStock,
      quantityDelta: -quantity,
      newQuantity: currentStock - quantity,
    };
  }

  // adjustment: sets exact counted inventory
  return {
    previousQuantity: currentStock,
    quantityDelta: quantity - currentStock,
    newQuantity: quantity,
  };
}

