import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import {
  budgetItems,
  budgets,
  clientPackages,
  clients,
  packageSessions,
  products,
  services,
} from "@/db/schema";
import { assertTenantOwnership } from "@/lib/tenant/context";
import { logAudit } from "@/lib/security/audit";
import { calculateSaleTotals } from "@/modules/commerce/calculations";
import { createIntegratedSale } from "@/modules/commerce/service";
import { createFinancialTransaction } from "@/modules/financial/service";
import { evaluatePackageHealth } from "./logic";
import type { CreateBudgetInput, CreatePackageInput } from "./schemas";

export async function getPackagesAndBudgetsData(organizationId: string) {
  const db = getDb();

  const [pkgRows, budgetRows] = await Promise.all([
    db
      .select({
        id: clientPackages.id,
        clientId: clientPackages.clientId,
        clientName: clients.name,
        serviceName: services.name,
        name: clientPackages.name,
        totalSessions: clientPackages.totalSessions,
        usedSessions: clientPackages.usedSessions,
        priceCents: clientPackages.priceCents,
        expiresAt: clientPackages.expiresAt,
        status: clientPackages.status,
        notes: clientPackages.notes,
      })
      .from(clientPackages)
      .innerJoin(clients, eq(clientPackages.clientId, clients.id))
      .leftJoin(services, eq(clientPackages.serviceId, services.id))
      .where(eq(clientPackages.organizationId, organizationId))
      .orderBy(desc(clientPackages.createdAt))
      .limit(150),
    db
      .select({
        id: budgets.id,
        clientId: budgets.clientId,
        clientName: clients.name,
        clientPhone: clients.whatsapp,
        title: budgets.title,
        subtotalCents: budgets.subtotalCents,
        discountCents: budgets.discountCents,
        totalCents: budgets.totalCents,
        validUntil: budgets.validUntil,
        status: budgets.status,
        notes: budgets.notes,
        createdAt: budgets.createdAt,
      })
      .from(budgets)
      .innerJoin(clients, eq(budgets.clientId, clients.id))
      .where(eq(budgets.organizationId, organizationId))
      .orderBy(desc(budgets.createdAt))
      .limit(150),
  ]);

  return {
    packages: pkgRows,
    budgets: budgetRows.map((b) => ({
      ...b,
      createdAtIso: b.createdAt.toISOString(),
    })),
  };
}

export async function createClientPackage(params: {
  organizationId: string;
  actorUserId: string;
  input: CreatePackageInput;
}) {
  const db = getDb();
  const { organizationId, actorUserId, input } = params;

  const [cli] = await db
    .select({ id: clients.id, organizationId: clients.organizationId })
    .from(clients)
    .where(and(eq(clients.id, input.clientId), isNull(clients.deletedAt)))
    .limit(1);
  assertTenantOwnership(cli?.organizationId, organizationId);

  const priceCents = Math.round(input.priceReais * 100);

  const [created] = await db
    .insert(clientPackages)
    .values({
      organizationId,
      clientId: input.clientId,
      serviceId: input.serviceId || null,
      name: input.name,
      totalSessions: input.totalSessions,
      usedSessions: 0,
      priceCents,
      expiresAt: input.expiresAt || null,
      status: "active",
      notes: input.notes || null,
      createdByUserId: actorUserId,
    })
    .returning();

  if (input.launchInFinancial && input.accountId && priceCents > 0) {
    await createFinancialTransaction({
      organizationId,
      actorUserId,
      input: {
        type: "income",
        description: `Pacote — ${input.name}`,
        amountReais: input.priceReais,
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
        clientId: input.clientId,
        supplierId: "",
        installments: 1,
        isRecurring: false,
        notes: "",
      },
    });
  }

  await logAudit({
    organizationId,
    actorUserId,
    action: "package.created",
    resourceType: "client_package",
    resourceId: created!.id,
    metadata: { totalSessions: input.totalSessions },
  });

  return created!;
}

export async function consumePackageSession(params: {
  organizationId: string;
  actorUserId: string;
  packageId: string;
  professionalId?: string;
  notes?: string;
}) {
  const db = getDb();
  const { organizationId, actorUserId, packageId, professionalId, notes } =
    params;

  const [pkg] = await db
    .select()
    .from(clientPackages)
    .where(eq(clientPackages.id, packageId))
    .limit(1);
  assertTenantOwnership(pkg?.organizationId, organizationId);

  const today = new Date().toISOString().slice(0, 10);
  const health = evaluatePackageHealth(pkg!, today);
  if (!health.canConsumeSession) {
    throw new Error(
      health.isExpired
        ? "Este pacote está vencido e não pode mais ser utilizado."
        : "Não há sessões restantes disponíveis neste pacote."
    );
  }

  const nextUsed = pkg!.usedSessions + 1;
  const nextStatus = nextUsed >= pkg!.totalSessions ? "completed" : "active";

  await db.insert(packageSessions).values({
    organizationId,
    packageId,
    professionalId: professionalId || null,
    notes: notes || null,
    actorUserId,
  });

  await db
    .update(clientPackages)
    .set({
      usedSessions: nextUsed,
      status: nextStatus,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(clientPackages.id, packageId),
        eq(clientPackages.organizationId, organizationId)
      )
    );

  await logAudit({
    organizationId,
    actorUserId,
    action: "package.session_consumed",
    resourceType: "client_package",
    resourceId: packageId,
    metadata: { usedSessions: nextUsed, totalSessions: pkg!.totalSessions },
  });
}

export async function createBudget(params: {
  organizationId: string;
  actorUserId: string;
  input: CreateBudgetInput;
}) {
  const db = getDb();
  const { organizationId, actorUserId, input } = params;

  const [cli] = await db
    .select({ id: clients.id, organizationId: clients.organizationId })
    .from(clients)
    .where(and(eq(clients.id, input.clientId), isNull(clients.deletedAt)))
    .limit(1);
  assertTenantOwnership(cli?.organizationId, organizationId);

  const prodIds = Array.from(
    new Set(input.items.filter((i) => i.itemType === "product").map((i) => i.itemId))
  );
  const svcIds = Array.from(
    new Set(input.items.filter((i) => i.itemType === "service").map((i) => i.itemId))
  );

  const [prodRows, svcRows] = await Promise.all([
    prodIds.length > 0
      ? db
          .select()
          .from(products)
          .where(
            and(
              eq(products.organizationId, organizationId),
              inArray(products.id, prodIds),
              isNull(products.deletedAt)
            )
          )
      : Promise.resolve([]),
    svcIds.length > 0
      ? db
          .select()
          .from(services)
          .where(
            and(
              eq(services.organizationId, organizationId),
              inArray(services.id, svcIds),
              isNull(services.deletedAt)
            )
          )
      : Promise.resolve([]),
  ]);

  const prodMap = new Map(prodRows.map((p) => [p.id, p]));
  const svcMap = new Map(svcRows.map((s) => [s.id, s]));

  const resolved = input.items.map((item) => {
    const unitCents = Math.round(item.unitPriceReais * 100);
    const ref =
      item.itemType === "product"
        ? prodMap.get(item.itemId)
        : svcMap.get(item.itemId);
    if (!ref) {
      throw new Error("Um ou mais itens não pertencem a esta organização.");
    }
    return {
      ...item,
      nameSnapshot: ref.name,
      unitCents,
      totalCents: unitCents * item.quantity,
    };
  });

  const discountCents = Math.round(input.discountReais * 100);
  const { subtotalCents, totalCents } = calculateSaleTotals(
    resolved.map((r) => ({ quantity: r.quantity, unitCents: r.unitCents })),
    discountCents
  );

  const [created] = await db
    .insert(budgets)
    .values({
      organizationId,
      clientId: input.clientId,
      title: input.title,
      subtotalCents,
      discountCents,
      totalCents,
      validUntil: input.validUntil || null,
      status: "draft",
      notes: input.notes || null,
      createdByUserId: actorUserId,
    })
    .returning();

  await db.insert(budgetItems).values(
    resolved.map((r) => ({
      organizationId,
      budgetId: created!.id,
      itemType: r.itemType,
      productId: r.itemType === "product" ? r.itemId : null,
      serviceId: r.itemType === "service" ? r.itemId : null,
      nameSnapshot: r.nameSnapshot,
      quantity: r.quantity,
      unitPriceCents: r.unitCents,
      totalCents: r.totalCents,
    }))
  );

  await logAudit({
    organizationId,
    actorUserId,
    action: "budget.created",
    resourceType: "budget",
    resourceId: created!.id,
    metadata: { totalCents },
  });

  return created!;
}

export async function updateBudgetStatus(params: {
  organizationId: string;
  actorUserId: string;
  budgetId: string;
  status: "sent" | "approved" | "rejected";
}) {
  const db = getDb();
  const { organizationId, actorUserId, budgetId, status } = params;

  const [existing] = await db
    .select({ id: budgets.id, organizationId: budgets.organizationId })
    .from(budgets)
    .where(eq(budgets.id, budgetId))
    .limit(1);
  assertTenantOwnership(existing?.organizationId, organizationId);

  await db
    .update(budgets)
    .set({ status, updatedAt: new Date() })
    .where(
      and(eq(budgets.id, budgetId), eq(budgets.organizationId, organizationId))
    );

  await logAudit({
    organizationId,
    actorUserId,
    action: "budget.status_changed",
    resourceType: "budget",
    resourceId: budgetId,
    metadata: { status },
  });
}

export async function convertBudgetToSale(params: {
  organizationId: string;
  actorUserId: string;
  budgetId: string;
  accountId: string;
  paymentMethod: "pix" | "cash" | "credit_card" | "debit_card" | "bank_transfer" | "other";
  installments: number;
}) {
  const db = getDb();
  const {
    organizationId,
    actorUserId,
    budgetId,
    accountId,
    paymentMethod,
    installments,
  } = params;

  const [budget] = await db
    .select()
    .from(budgets)
    .where(eq(budgets.id, budgetId))
    .limit(1);
  assertTenantOwnership(budget?.organizationId, organizationId);

  if (budget!.status === "converted") {
    throw new Error("Este orçamento já foi convertido em venda.");
  }

  const items = await db
    .select()
    .from(budgetItems)
    .where(
      and(
        eq(budgetItems.budgetId, budgetId),
        eq(budgetItems.organizationId, organizationId)
      )
    );

  const saleLines = items
    .map((item) => ({
      itemType: item.itemType,
      itemId: item.itemType === "product" ? item.productId! : item.serviceId!,
      quantity: item.quantity,
      unitPriceReais: item.unitPriceCents / 100,
    }))
    .filter((l) => Boolean(l.itemId));

  if (saleLines.length === 0) {
    throw new Error("Orçamento sem itens válidos para conversão.");
  }

  const sale = await createIntegratedSale({
    organizationId,
    actorUserId,
    input: {
      clientId: budget!.clientId,
      professionalId: "",
      accountId,
      paymentMethod,
      installments,
      discountReais: budget!.discountCents / 100,
      notes: `Convertido do orçamento: ${budget!.title}`,
      items: saleLines,
    },
  });

  await db
    .update(budgets)
    .set({
      status: "converted",
      convertedSaleId: sale.id,
      updatedAt: new Date(),
    })
    .where(
      and(eq(budgets.id, budgetId), eq(budgets.organizationId, organizationId))
    );

  return sale;
}

