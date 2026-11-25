import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import {
  clients,
  costCenters,
  financialAccounts,
  financialCategories,
  financialTransactions,
  suppliers,
} from "@/db/schema";
import { assertTenantOwnership } from "@/lib/tenant/context";
import { logAudit } from "@/lib/security/audit";
import {
  buildInstallments,
  calculateNetAmountCents,
} from "./calculations";
import type { SettleTransactionInput, TransactionInput } from "./schemas";

const DEFAULT_CATEGORIES = [
  { name: "Atendimentos e Serviços", type: "income" as const, color: "#2563EB" },
  { name: "Venda de Produtos", type: "income" as const, color: "#10B981" },
  { name: "Pacotes e Planos", type: "income" as const, color: "#6366F1" },
  { name: "Aluguel e Estrutura", type: "expense" as const, color: "#EF4444" },
  { name: "Salários e Comissões", type: "expense" as const, color: "#F97316" },
  { name: "Insumos e Compras", type: "expense" as const, color: "#F59E0B" },
  { name: "Impostos e Taxas", type: "expense" as const, color: "#64748B" },
  { name: "Marketing", type: "expense" as const, color: "#8B5CF6" },
];

export async function ensureFinancialDefaults(organizationId: string) {
  const db = getDb();

  const [existingAccount, existingCat] = await Promise.all([
    db
      .select({ id: financialAccounts.id })
      .from(financialAccounts)
      .where(
        and(
          eq(financialAccounts.organizationId, organizationId),
          isNull(financialAccounts.deletedAt)
        )
      )
      .limit(1),
    db
      .select({ id: financialCategories.id })
      .from(financialCategories)
      .where(
        and(
          eq(financialCategories.organizationId, organizationId),
          isNull(financialCategories.deletedAt)
        )
      )
      .limit(1),
  ]);

  if (existingAccount.length === 0) {
    await db.insert(financialAccounts).values({
      organizationId,
      name: "Caixa Principal",
      type: "cash",
      initialBalanceCents: 0,
    });
  }

  if (existingCat.length === 0) {
    await db.insert(financialCategories).values(
      DEFAULT_CATEGORIES.map((c) => ({
        organizationId,
        name: c.name,
        type: c.type,
        color: c.color,
      }))
    );
  }
}

export async function getFinancialWorkspaceData(organizationId: string) {
  await ensureFinancialDefaults(organizationId);
  const db = getDb();

  const [accounts, categories, centers, transactions] = await Promise.all([
    db
      .select()
      .from(financialAccounts)
      .where(
        and(
          eq(financialAccounts.organizationId, organizationId),
          isNull(financialAccounts.deletedAt)
        )
      )
      .orderBy(asc(financialAccounts.name)),
    db
      .select()
      .from(financialCategories)
      .where(
        and(
          eq(financialCategories.organizationId, organizationId),
          isNull(financialCategories.deletedAt)
        )
      )
      .orderBy(asc(financialCategories.type), asc(financialCategories.name)),
    db
      .select()
      .from(costCenters)
      .where(
        and(
          eq(costCenters.organizationId, organizationId),
          isNull(costCenters.deletedAt)
        )
      )
      .orderBy(asc(costCenters.name)),
    db
      .select({
        id: financialTransactions.id,
        type: financialTransactions.type,
        description: financialTransactions.description,
        amountCents: financialTransactions.amountCents,
        discountCents: financialTransactions.discountCents,
        interestCents: financialTransactions.interestCents,
        fineCents: financialTransactions.fineCents,
        paidAmountCents: financialTransactions.paidAmountCents,
        status: financialTransactions.status,
        paymentMethod: financialTransactions.paymentMethod,
        dueDate: financialTransactions.dueDate,
        paidAt: financialTransactions.paidAt,
        accountId: financialTransactions.accountId,
        destinationAccountId: financialTransactions.destinationAccountId,
        categoryId: financialTransactions.categoryId,
        categoryName: financialCategories.name,
        costCenterId: financialTransactions.costCenterId,
        clientId: financialTransactions.clientId,
        clientName: clients.name,
        supplierId: financialTransactions.supplierId,
        supplierName: suppliers.name,
        installmentNumber: financialTransactions.installmentNumber,
        installmentTotal: financialTransactions.installmentTotal,
        isRecurring: financialTransactions.isRecurring,
        notes: financialTransactions.notes,
      })
      .from(financialTransactions)
      .leftJoin(
        financialCategories,
        eq(financialTransactions.categoryId, financialCategories.id)
      )
      .leftJoin(clients, eq(financialTransactions.clientId, clients.id))
      .leftJoin(suppliers, eq(financialTransactions.supplierId, suppliers.id))
      .where(
        and(
          eq(financialTransactions.organizationId, organizationId),
          isNull(financialTransactions.deletedAt)
        )
      )
      .orderBy(desc(financialTransactions.dueDate), desc(financialTransactions.createdAt))
      .limit(300),
  ]);

  // Calculate live balance per account from initial balance + settled transactions
  const balanceByAccount = new Map<string, number>();
  for (const acc of accounts) {
    balanceByAccount.set(acc.id, acc.initialBalanceCents);
  }

  for (const tx of transactions) {
    if (tx.status === "cancelled" || tx.paidAmountCents <= 0) continue;
    if (tx.type === "income") {
      balanceByAccount.set(
        tx.accountId,
        (balanceByAccount.get(tx.accountId) ?? 0) + tx.paidAmountCents
      );
    } else if (tx.type === "expense") {
      balanceByAccount.set(
        tx.accountId,
        (balanceByAccount.get(tx.accountId) ?? 0) - tx.paidAmountCents
      );
    } else if (tx.type === "transfer" && tx.destinationAccountId) {
      balanceByAccount.set(
        tx.accountId,
        (balanceByAccount.get(tx.accountId) ?? 0) - tx.paidAmountCents
      );
      balanceByAccount.set(
        tx.destinationAccountId,
        (balanceByAccount.get(tx.destinationAccountId) ?? 0) + tx.paidAmountCents
      );
    }
  }

  return {
    accounts: accounts.map((a) => ({
      ...a,
      currentBalanceCents: balanceByAccount.get(a.id) ?? a.initialBalanceCents,
    })),
    categories,
    costCenters: centers,
    transactions: transactions.map((t) => ({
      ...t,
      paidAtIso: t.paidAt ? t.paidAt.toISOString() : null,
    })),
  };
}

export async function createFinancialTransaction(params: {
  organizationId: string;
  actorUserId: string;
  input: TransactionInput;
}) {
  const db = getDb();
  const { organizationId, actorUserId, input } = params;

  // Validate tenant ownership of account
  const [acc] = await db
    .select({ id: financialAccounts.id, organizationId: financialAccounts.organizationId })
    .from(financialAccounts)
    .where(and(eq(financialAccounts.id, input.accountId), isNull(financialAccounts.deletedAt)))
    .limit(1);
  assertTenantOwnership(acc?.organizationId, organizationId);

  if (input.type === "transfer") {
    if (!input.destinationAccountId || input.destinationAccountId === input.accountId) {
      throw new Error("Selecione uma conta de destino diferente para a transferência.");
    }
    const [dest] = await db
      .select({ id: financialAccounts.id, organizationId: financialAccounts.organizationId })
      .from(financialAccounts)
      .where(
        and(
          eq(financialAccounts.id, input.destinationAccountId),
          isNull(financialAccounts.deletedAt)
        )
      )
      .limit(1);
    assertTenantOwnership(dest?.organizationId, organizationId);
  }

  const totalAmountCents = Math.round(input.amountReais * 100);
  const discountCents = Math.round(input.discountReais * 100);
  const interestCents = Math.round(input.interestReais * 100);
  const fineCents = Math.round(input.fineReais * 100);

  const count = input.type === "transfer" ? 1 : input.installments;
  const installmentGroupId = count > 1 ? crypto.randomUUID() : null;
  const parts = buildInstallments(totalAmountCents, count, input.dueDate);

  const rowsToInsert = parts.map((part, idx) => {
    const partDiscount = idx === 0 ? discountCents : 0;
    const partInterest = idx === 0 ? interestCents : 0;
    const partFine = idx === 0 ? fineCents : 0;
    const net = calculateNetAmountCents({
      amountCents: part.amountCents,
      discountCents: partDiscount,
      interestCents: partInterest,
      fineCents: partFine,
    });

    const isPaid = input.markAsPaid && (idx === 0 || count === 1);
    return {
      organizationId,
      type: input.type,
      description:
        count > 1
          ? `${input.description} (${part.installmentNumber}/${part.installmentTotal})`
          : input.description,
      amountCents: part.amountCents,
      discountCents: partDiscount,
      interestCents: partInterest,
      fineCents: partFine,
      paidAmountCents: isPaid ? net : 0,
      status: (isPaid ? "paid" : "pending") as "paid" | "pending",
      paymentMethod: input.paymentMethod,
      dueDate: part.dueDate,
      paidAt: isPaid ? new Date() : null,
      accountId: input.accountId,
      destinationAccountId: input.destinationAccountId || null,
      categoryId: input.categoryId || null,
      costCenterId: input.costCenterId || null,
      clientId: input.clientId || null,
      supplierId: input.supplierId || null,
      installmentGroupId,
      installmentNumber: part.installmentNumber,
      installmentTotal: part.installmentTotal,
      isRecurring: input.isRecurring,
      notes: input.notes || null,
      createdByUserId: actorUserId,
    };
  });

  const inserted = await db
    .insert(financialTransactions)
    .values(rowsToInsert)
    .returning({ id: financialTransactions.id });

  await logAudit({
    organizationId,
    actorUserId,
    action: "financial.transaction_created",
    resourceType: "financial_transaction",
    resourceId: inserted[0]?.id ?? null,
    metadata: {
      type: input.type,
      installments: count,
      paymentMethod: input.paymentMethod,
    },
  });

  return inserted[0]!;
}

export async function settleFinancialTransaction(params: {
  organizationId: string;
  actorUserId: string;
  transactionId: string;
  input: SettleTransactionInput;
}) {
  const db = getDb();
  const { organizationId, actorUserId, transactionId, input } = params;

  const [existing] = await db
    .select()
    .from(financialTransactions)
    .where(
      and(
        eq(financialTransactions.id, transactionId),
        isNull(financialTransactions.deletedAt)
      )
    )
    .limit(1);

  assertTenantOwnership(existing?.organizationId, organizationId);

  const discountCents = Math.round(input.discountReais * 100);
  const interestCents = Math.round(input.interestReais * 100);
  const fineCents = Math.round(input.fineReais * 100);
  const addedPaidCents = Math.round(input.paidAmountReais * 100);

  const net = calculateNetAmountCents({
    amountCents: existing!.amountCents,
    discountCents,
    interestCents,
    fineCents,
  });

  const newPaidCents = Math.min(net, existing!.paidAmountCents + addedPaidCents);
  const newStatus = newPaidCents >= net ? "paid" : "partial";

  await db
    .update(financialTransactions)
    .set({
      discountCents,
      interestCents,
      fineCents,
      paidAmountCents: newPaidCents,
      status: newStatus,
      paymentMethod: input.paymentMethod,
      paidAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(financialTransactions.id, transactionId),
        eq(financialTransactions.organizationId, organizationId)
      )
    );

  await logAudit({
    organizationId,
    actorUserId,
    action: "financial.transaction_settled",
    resourceType: "financial_transaction",
    resourceId: transactionId,
    metadata: { status: newStatus, paymentMethod: input.paymentMethod },
  });
}

export async function cancelFinancialTransaction(params: {
  organizationId: string;
  actorUserId: string;
  transactionId: string;
}) {
  const db = getDb();
  const { organizationId, actorUserId, transactionId } = params;

  const [existing] = await db
    .select({
      id: financialTransactions.id,
      organizationId: financialTransactions.organizationId,
    })
    .from(financialTransactions)
    .where(
      and(
        eq(financialTransactions.id, transactionId),
        isNull(financialTransactions.deletedAt)
      )
    )
    .limit(1);

  assertTenantOwnership(existing?.organizationId, organizationId);

  await db
    .update(financialTransactions)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(
      and(
        eq(financialTransactions.id, transactionId),
        eq(financialTransactions.organizationId, organizationId)
      )
    );

  await logAudit({
    organizationId,
    actorUserId,
    action: "financial.transaction_cancelled",
    resourceType: "financial_transaction",
    resourceId: transactionId,
  });
}

