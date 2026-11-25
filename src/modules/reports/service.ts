import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import {
  appointments,
  clients,
  commissions,
  financialTransactions,
  products,
  professionals,
  sales,
} from "@/db/schema";
import { summarizeFinancialMetrics } from "@/modules/financial/calculations";
import { summarizeCommissions } from "@/modules/team/calculations";

export async function getExecutiveReportsData(organizationId: string) {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);

  const [
    apptRows,
    finRows,
    clientRows,
    saleRows,
    commRows,
    prodRows,
    profRows,
  ] = await Promise.all([
    db
      .select({
        id: appointments.id,
        professionalId: appointments.professionalId,
        status: appointments.status,
        totalPriceCents: appointments.totalPriceCents,
        startsAt: appointments.startsAt,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.organizationId, organizationId),
          isNull(appointments.deletedAt)
        )
      ),
    db
      .select({
        type: financialTransactions.type,
        status: financialTransactions.status,
        amountCents: financialTransactions.amountCents,
        discountCents: financialTransactions.discountCents,
        interestCents: financialTransactions.interestCents,
        fineCents: financialTransactions.fineCents,
        paidAmountCents: financialTransactions.paidAmountCents,
        dueDate: financialTransactions.dueDate,
      })
      .from(financialTransactions)
      .where(
        and(
          eq(financialTransactions.organizationId, organizationId),
          isNull(financialTransactions.deletedAt)
        )
      ),
    db
      .select({
        id: clients.id,
        status: clients.status,
        lgpdConsentAt: clients.lgpdConsentAt,
      })
      .from(clients)
      .where(
        and(eq(clients.organizationId, organizationId), isNull(clients.deletedAt))
      ),
    db
      .select({
        id: sales.id,
        totalCents: sales.totalCents,
        status: sales.status,
      })
      .from(sales)
      .where(eq(sales.organizationId, organizationId)),
    db
      .select({
        status: commissions.status,
        commissionAmountCents: commissions.commissionAmountCents,
      })
      .from(commissions)
      .where(eq(commissions.organizationId, organizationId)),
    db
      .select({
        id: products.id,
        name: products.name,
        stockQuantity: products.stockQuantity,
        minStockQuantity: products.minStockQuantity,
        costCents: products.costCents,
        priceCents: products.priceCents,
      })
      .from(products)
      .where(
        and(eq(products.organizationId, organizationId), isNull(products.deletedAt))
      ),
    db
      .select({ id: professionals.id, name: professionals.name })
      .from(professionals)
      .where(
        and(
          eq(professionals.organizationId, organizationId),
          isNull(professionals.deletedAt)
        )
      ),
  ]);

  const financialSummary = summarizeFinancialMetrics(finRows, today);
  const commissionSummary = summarizeCommissions(commRows);

  const completedAppts = apptRows.filter((a) => a.status === "completed").length;
  const cancelledAppts = apptRows.filter((a) => a.status === "cancelled").length;
  const noShowAppts = apptRows.filter((a) => a.status === "no_show").length;
  const attendanceRate =
    apptRows.length > 0
      ? Math.round(
          ((apptRows.length - cancelledAppts - noShowAppts) / apptRows.length) *
            100
        )
      : 0;

  const profNameById = new Map(profRows.map((p) => [p.id, p.name]));
  const perfMap = new Map<string, { name: string; count: number; revenueCents: number }>();
  for (const a of apptRows) {
    if (a.status === "cancelled" || a.status === "no_show") continue;
    const entry = perfMap.get(a.professionalId) ?? {
      name: profNameById.get(a.professionalId) ?? "Profissional",
      count: 0,
      revenueCents: 0,
    };
    entry.count++;
    entry.revenueCents += a.totalPriceCents;
    perfMap.set(a.professionalId, entry);
  }
  const topProfessionals = Array.from(perfMap.values())
    .sort((a, b) => b.revenueCents - a.revenueCents)
    .slice(0, 5);

  const completedSales = saleRows.filter((s) => s.status === "completed");
  const totalSalesCents = completedSales.reduce((acc, s) => acc + s.totalCents, 0);

  const lowStockCount = prodRows.filter(
    (p) => p.stockQuantity <= p.minStockQuantity
  ).length;
  const inventoryCostValueCents = prodRows.reduce(
    (acc, p) => acc + p.stockQuantity * p.costCents,
    0
  );
  const inventorySaleValueCents = prodRows.reduce(
    (acc, p) => acc + p.stockQuantity * p.priceCents,
    0
  );

  return {
    agenda: {
      total: apptRows.length,
      completed: completedAppts,
      cancelled: cancelledAppts,
      noShow: noShowAppts,
      attendanceRate,
      topProfessionals,
    },
    financial: financialSummary,
    clients: {
      total: clientRows.length,
      active: clientRows.filter((c) => c.status === "active").length,
      withLgpdConsent: clientRows.filter((c) => Boolean(c.lgpdConsentAt)).length,
    },
    sales: {
      count: completedSales.length,
      totalCents: totalSalesCents,
      averageTicketCents:
        completedSales.length > 0
          ? Math.round(totalSalesCents / completedSales.length)
          : 0,
    },
    commissions: commissionSummary,
    inventory: {
      totalProducts: prodRows.length,
      lowStockCount,
      costValueCents: inventoryCostValueCents,
      saleValueCents: inventorySaleValueCents,
    },
  };
}

