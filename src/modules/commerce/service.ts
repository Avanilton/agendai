import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import {
  clients,
  financialAccounts,
  inventoryMovements,
  products,
  professionals,
  purchaseItems,
  purchases,
  saleItems,
  sales,
  services,
  suppliers,
} from "@/db/schema";
import { assertTenantOwnership } from "@/lib/tenant/context";
import { logAudit } from "@/lib/security/audit";
import { createFinancialTransaction } from "@/modules/financial/service";
import {
  calculatePurchaseTotals,
  calculateSaleTotals,
  computeStockAfterMovement,
} from "./calculations";
import type {
  CreatePurchaseInput,
  CreateSaleInput,
  ManualMovementInput,
} from "./schemas";

export async function listSales(organizationId: string) {
  const db = getDb();
  return db
    .select({
      id: sales.id,
      clientName: clients.name,
      professionalName: professionals.name,
      subtotalCents: sales.subtotalCents,
      discountCents: sales.discountCents,
      totalCents: sales.totalCents,
      paymentMethod: sales.paymentMethod,
      installments: sales.installments,
      status: sales.status,
      notes: sales.notes,
      createdAt: sales.createdAt,
    })
    .from(sales)
    .leftJoin(clients, eq(sales.clientId, clients.id))
    .leftJoin(professionals, eq(sales.professionalId, professionals.id))
    .where(eq(sales.organizationId, organizationId))
    .orderBy(desc(sales.createdAt))
    .limit(150);
}

export async function listPurchases(organizationId: string) {
  const db = getDb();
  return db
    .select({
      id: purchases.id,
      supplierName: suppliers.name,
      subtotalCents: purchases.subtotalCents,
      discountCents: purchases.discountCents,
      taxCents: purchases.taxCents,
      totalCents: purchases.totalCents,
      paymentMethod: purchases.paymentMethod,
      status: purchases.status,
      notes: purchases.notes,
      receivedAt: purchases.receivedAt,
    })
    .from(purchases)
    .innerJoin(suppliers, eq(purchases.supplierId, suppliers.id))
    .where(eq(purchases.organizationId, organizationId))
    .orderBy(desc(purchases.createdAt))
    .limit(150);
}

export async function listInventoryMovements(organizationId: string) {
  const db = getDb();
  return db
    .select({
      id: inventoryMovements.id,
      productId: inventoryMovements.productId,
      productName: products.name,
      type: inventoryMovements.type,
      quantityDelta: inventoryMovements.quantityDelta,
      previousQuantity: inventoryMovements.previousQuantity,
      newQuantity: inventoryMovements.newQuantity,
      reason: inventoryMovements.reason,
      createdAt: inventoryMovements.createdAt,
    })
    .from(inventoryMovements)
    .innerJoin(products, eq(inventoryMovements.productId, products.id))
    .where(eq(inventoryMovements.organizationId, organizationId))
    .orderBy(desc(inventoryMovements.createdAt))
    .limit(200);
}

export async function registerManualStockMovement(params: {
  organizationId: string;
  actorUserId: string;
  input: ManualMovementInput;
}) {
  const db = getDb();
  const { organizationId, actorUserId, input } = params;

  const [prod] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, input.productId), isNull(products.deletedAt)))
    .limit(1);

  assertTenantOwnership(prod?.organizationId, organizationId);

  const transition = computeStockAfterMovement({
    currentStock: prod!.stockQuantity,
    type: input.type,
    quantity: input.quantity,
  });

  await db
    .update(products)
    .set({
      stockQuantity: transition.newQuantity,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(products.id, input.productId),
        eq(products.organizationId, organizationId)
      )
    );

  const [movement] = await db
    .insert(inventoryMovements)
    .values({
      organizationId,
      productId: input.productId,
      type: input.type,
      quantityDelta: transition.quantityDelta,
      previousQuantity: transition.previousQuantity,
      newQuantity: transition.newQuantity,
      reason: input.reason,
      actorUserId,
    })
    .returning();

  await logAudit({
    organizationId,
    actorUserId,
    action: "inventory.movement_created",
    resourceType: "inventory_movement",
    resourceId: movement?.id ?? null,
    metadata: {
      productId: input.productId,
      type: input.type,
      delta: transition.quantityDelta,
    },
  });

  return movement!;
}

export async function createIntegratedSale(params: {
  organizationId: string;
  actorUserId: string;
  input: CreateSaleInput;
}) {
  const db = getDb();
  const { organizationId, actorUserId, input } = params;

  // Validate account belongs to tenant
  const [acc] = await db
    .select({ id: financialAccounts.id, organizationId: financialAccounts.organizationId })
    .from(financialAccounts)
    .where(and(eq(financialAccounts.id, input.accountId), isNull(financialAccounts.deletedAt)))
    .limit(1);
  assertTenantOwnership(acc?.organizationId, organizationId);

  // Validate products & services belong to tenant and have sufficient stock
  const productIds = Array.from(
    new Set(
      input.items.filter((i) => i.itemType === "product").map((i) => i.itemId)
    )
  );
  const serviceIds = Array.from(
    new Set(
      input.items.filter((i) => i.itemType === "service").map((i) => i.itemId)
    )
  );

  const [prodRows, svcRows] = await Promise.all([
    productIds.length > 0
      ? db
          .select()
          .from(products)
          .where(
            and(
              eq(products.organizationId, organizationId),
              inArray(products.id, productIds),
              isNull(products.deletedAt)
            )
          )
      : Promise.resolve([]),
    serviceIds.length > 0
      ? db
          .select()
          .from(services)
          .where(
            and(
              eq(services.organizationId, organizationId),
              inArray(services.id, serviceIds),
              isNull(services.deletedAt)
            )
          )
      : Promise.resolve([]),
  ]);

  const prodMap = new Map(prodRows.map((p) => [p.id, p]));
  const svcMap = new Map(svcRows.map((s) => [s.id, s]));

  // Aggregate required stock per product to check availability accurately
  const stockNeeded = new Map<string, number>();
  const resolvedLines = input.items.map((item) => {
    const unitCents = Math.round(item.unitPriceReais * 100);
    if (item.itemType === "product") {
      const prod = prodMap.get(item.itemId);
      if (!prod) {
        throw new Error("Produto selecionado não pertence a esta organização.");
      }
      stockNeeded.set(
        prod.id,
        (stockNeeded.get(prod.id) ?? 0) + item.quantity
      );
      return {
        ...item,
        nameSnapshot: prod.name,
        unitCents,
        totalCents: unitCents * item.quantity,
      };
    } else {
      const svc = svcMap.get(item.itemId);
      if (!svc) {
        throw new Error("Serviço selecionado não pertence a esta organização.");
      }
      return {
        ...item,
        nameSnapshot: svc.name,
        unitCents,
        totalCents: unitCents * item.quantity,
      };
    }
  });

  // Verify stock availability before mutating anything
  for (const [prodId, qty] of stockNeeded.entries()) {
    const prod = prodMap.get(prodId)!;
    computeStockAfterMovement({
      currentStock: prod.stockQuantity,
      type: "out",
      quantity: qty,
    });
  }

  const discountCents = Math.round(input.discountReais * 100);
  const { subtotalCents, totalCents } = calculateSaleTotals(
    resolvedLines.map((l) => ({ quantity: l.quantity, unitCents: l.unitCents })),
    discountCents
  );

  const [createdSale] = await db
    .insert(sales)
    .values({
      organizationId,
      clientId: input.clientId || null,
      professionalId: input.professionalId || null,
      subtotalCents,
      discountCents,
      totalCents,
      paymentMethod: input.paymentMethod,
      installments: input.installments,
      accountId: input.accountId,
      status: "completed",
      notes: input.notes || null,
      createdByUserId: actorUserId,
    })
    .returning();

  await db.insert(saleItems).values(
    resolvedLines.map((line) => ({
      organizationId,
      saleId: createdSale!.id,
      itemType: line.itemType,
      productId: line.itemType === "product" ? line.itemId : null,
      serviceId: line.itemType === "service" ? line.itemId : null,
      nameSnapshot: line.nameSnapshot,
      quantity: line.quantity,
      unitPriceCents: line.unitCents,
      totalCents: line.totalCents,
    }))
  );

  // Deduct stock + log traceable inventory_movements
  for (const [prodId, qty] of stockNeeded.entries()) {
    const prod = prodMap.get(prodId)!;
    const transition = computeStockAfterMovement({
      currentStock: prod.stockQuantity,
      type: "out",
      quantity: qty,
    });

    await db
      .update(products)
      .set({ stockQuantity: transition.newQuantity, updatedAt: new Date() })
      .where(
        and(eq(products.id, prodId), eq(products.organizationId, organizationId))
      );

    await db.insert(inventoryMovements).values({
      organizationId,
      productId: prodId,
      type: "out",
      quantityDelta: transition.quantityDelta,
      previousQuantity: transition.previousQuantity,
      newQuantity: transition.newQuantity,
      reason: `Venda #${createdSale!.id.slice(0, 8)}`,
      saleId: createdSale!.id,
      actorUserId,
    });
  }

  // Integrate automatically with Financial module (income transaction)
  if (totalCents > 0) {
    await createFinancialTransaction({
      organizationId,
      actorUserId,
      input: {
        type: "income",
        description: `Venda (${resolvedLines.map((l) => l.nameSnapshot).join(", ").slice(0, 100)})`,
        amountReais: totalCents / 100,
        discountReais: 0,
        interestReais: 0,
        fineReais: 0,
        paymentMethod: input.paymentMethod,
        dueDate: new Date().toISOString().slice(0, 10),
        markAsPaid: true,
        accountId: input.accountId,
        destinationAccountId: "",
        categoryId: "",
        costCenterId: "",
        clientId: input.clientId || "",
        supplierId: "",
        installments: input.installments,
        isRecurring: false,
        notes: input.notes || "",
      },
    });
  }

  await logAudit({
    organizationId,
    actorUserId,
    action: "sale.created",
    resourceType: "sale",
    resourceId: createdSale!.id,
    metadata: { totalCents, itemCount: resolvedLines.length },
  });

  return createdSale!;
}

export async function createIntegratedPurchase(params: {
  organizationId: string;
  actorUserId: string;
  input: CreatePurchaseInput;
}) {
  const db = getDb();
  const { organizationId, actorUserId, input } = params;

  const [sup] = await db
    .select({ id: suppliers.id, organizationId: suppliers.organizationId, name: suppliers.name })
    .from(suppliers)
    .where(and(eq(suppliers.id, input.supplierId), isNull(suppliers.deletedAt)))
    .limit(1);
  assertTenantOwnership(sup?.organizationId, organizationId);

  const [acc] = await db
    .select({ id: financialAccounts.id, organizationId: financialAccounts.organizationId })
    .from(financialAccounts)
    .where(and(eq(financialAccounts.id, input.accountId), isNull(financialAccounts.deletedAt)))
    .limit(1);
  assertTenantOwnership(acc?.organizationId, organizationId);

  const prodIds = Array.from(new Set(input.items.map((i) => i.productId)));
  const prodRows = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.organizationId, organizationId),
        inArray(products.id, prodIds),
        isNull(products.deletedAt)
      )
    );

  const prodMap = new Map(prodRows.map((p) => [p.id, p]));
  if (prodMap.size !== prodIds.length) {
    throw new Error("Um ou mais produtos não pertencem a esta organização.");
  }

  const resolvedLines = input.items.map((item) => {
    const prod = prodMap.get(item.productId)!;
    const unitCents = Math.round(item.unitCostReais * 100);
    return {
      ...item,
      nameSnapshot: prod.name,
      unitCents,
      totalCents: unitCents * item.quantity,
    };
  });

  const discountCents = Math.round(input.discountReais * 100);
  const taxCents = Math.round(input.taxReais * 100);
  const { subtotalCents, totalCents } = calculatePurchaseTotals(
    resolvedLines.map((l) => ({ quantity: l.quantity, unitCents: l.unitCents })),
    discountCents,
    taxCents
  );

  const [createdPurchase] = await db
    .insert(purchases)
    .values({
      organizationId,
      supplierId: input.supplierId,
      subtotalCents,
      discountCents,
      taxCents,
      totalCents,
      paymentMethod: input.paymentMethod,
      accountId: input.accountId,
      status: "received",
      notes: input.notes || null,
      createdByUserId: actorUserId,
    })
    .returning();

  await db.insert(purchaseItems).values(
    resolvedLines.map((line) => ({
      organizationId,
      purchaseId: createdPurchase!.id,
      productId: line.productId,
      nameSnapshot: line.nameSnapshot,
      quantity: line.quantity,
      unitCostCents: line.unitCents,
      totalCents: line.totalCents,
    }))
  );

  // Add stock + log traceable inventory_movements
  for (const line of resolvedLines) {
    const prod = prodMap.get(line.productId)!;
    const transition = computeStockAfterMovement({
      currentStock: prod.stockQuantity,
      type: "in",
      quantity: line.quantity,
    });
    prod.stockQuantity = transition.newQuantity;

    await db
      .update(products)
      .set({
        stockQuantity: transition.newQuantity,
        costCents: line.unitCents > 0 ? line.unitCents : prod.costCents,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(products.id, line.productId),
          eq(products.organizationId, organizationId)
        )
      );

    await db.insert(inventoryMovements).values({
      organizationId,
      productId: line.productId,
      type: "in",
      quantityDelta: transition.quantityDelta,
      previousQuantity: transition.previousQuantity,
      newQuantity: transition.newQuantity,
      reason: `Compra de ${sup!.name} (#${createdPurchase!.id.slice(0, 8)})`,
      purchaseId: createdPurchase!.id,
      actorUserId,
    });
  }

  // Integrate automatically with Financial module (expense transaction)
  if (totalCents > 0) {
    await createFinancialTransaction({
      organizationId,
      actorUserId,
      input: {
        type: "expense",
        description: `Compra — ${sup!.name}`,
        amountReais: totalCents / 100,
        discountReais: 0,
        interestReais: 0,
        fineReais: 0,
        paymentMethod: input.paymentMethod,
        dueDate: new Date().toISOString().slice(0, 10),
        markAsPaid: true,
        accountId: input.accountId,
        destinationAccountId: "",
        categoryId: "",
        costCenterId: "",
        clientId: "",
        supplierId: input.supplierId,
        installments: 1,
        isRecurring: false,
        notes: input.notes || "",
      },
    });
  }

  await logAudit({
    organizationId,
    actorUserId,
    action: "purchase.created",
    resourceType: "purchase",
    resourceId: createdPurchase!.id,
    metadata: { totalCents, itemCount: resolvedLines.length },
  });

  return createdPurchase!;
}

