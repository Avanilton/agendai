export type FinancialTxType = "income" | "expense" | "transfer";
export type FinancialTxStatus = "pending" | "paid" | "partial" | "cancelled";

/**
 * Calculates net payable/receivable amount in cents:
 * max(0, amount - discount + interest + fine)
 */
export function calculateNetAmountCents(params: {
  amountCents: number;
  discountCents?: number;
  interestCents?: number;
  fineCents?: number;
}): number {
  const net =
    params.amountCents -
    (params.discountCents ?? 0) +
    (params.interestCents ?? 0) +
    (params.fineCents ?? 0);
  return Math.max(0, net);
}

export interface GeneratedInstallment {
  installmentNumber: number;
  installmentTotal: number;
  amountCents: number;
  dueDate: string; // YYYY-MM-DD
}

/**
 * Splits a total amount in cents across N monthly installments with ZERO rounding loss.
 * Any remainder cents are added to the first installment so sum(installments) === totalCents.
 */
export function buildInstallments(
  totalCents: number,
  installmentCount: number,
  firstDueDate: string
): GeneratedInstallment[] {
  const count = Math.max(1, Math.min(24, Math.floor(installmentCount)));
  const base = Math.floor(totalCents / count);
  const remainder = totalCents - base * count;

  const [yStr, mStr, dStr] = firstDueDate.split("-");
  const startYear = Number(yStr);
  const startMonth = Number(mStr) - 1;
  const startDay = Number(dStr);

  const result: GeneratedInstallment[] = [];
  for (let i = 0; i < count; i++) {
    const targetMonthIndex = startMonth + i;
    const year = startYear + Math.floor(targetMonthIndex / 12);
    const month = targetMonthIndex % 12;
    const maxDay = new Date(year, month + 1, 0).getDate();
    const day = Math.min(startDay, maxDay);

    const dueDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    result.push({
      installmentNumber: i + 1,
      installmentTotal: count,
      amountCents: i === 0 ? base + remainder : base,
      dueDate,
    });
  }

  return result;
}

export interface SummarizableTransaction {
  type: FinancialTxType;
  status: FinancialTxStatus;
  amountCents: number;
  discountCents: number;
  interestCents: number;
  fineCents: number;
  paidAmountCents: number;
  dueDate: string;
}

export interface FinancialSummary {
  totalIncomeReceivedCents: number;
  totalExpensePaidCents: number;
  netProfitCents: number;
  receivablePendingCents: number;
  payablePendingCents: number;
  overdueCount: number;
  overdueCents: number;
  averageTicketCents: number;
}

export function summarizeFinancialMetrics(
  transactions: SummarizableTransaction[],
  todayDateStr: string
): FinancialSummary {
  let totalIncomeReceivedCents = 0;
  let totalExpensePaidCents = 0;
  let receivablePendingCents = 0;
  let payablePendingCents = 0;
  let overdueCount = 0;
  let overdueCents = 0;
  let paidIncomeCount = 0;

  for (const tx of transactions) {
    if (tx.status === "cancelled" || tx.type === "transfer") continue;

    const net = calculateNetAmountCents(tx);
    const remaining = Math.max(0, net - tx.paidAmountCents);

    if (tx.type === "income") {
      totalIncomeReceivedCents += tx.paidAmountCents;
      if (tx.paidAmountCents > 0) paidIncomeCount++;
      if (tx.status === "pending" || tx.status === "partial") {
        receivablePendingCents += remaining;
        if (tx.dueDate < todayDateStr) {
          overdueCount++;
          overdueCents += remaining;
        }
      }
    } else if (tx.type === "expense") {
      totalExpensePaidCents += tx.paidAmountCents;
      if (tx.status === "pending" || tx.status === "partial") {
        payablePendingCents += remaining;
        if (tx.dueDate < todayDateStr) {
          overdueCount++;
          overdueCents += remaining;
        }
      }
    }
  }

  return {
    totalIncomeReceivedCents,
    totalExpensePaidCents,
    netProfitCents: totalIncomeReceivedCents - totalExpensePaidCents,
    receivablePendingCents,
    payablePendingCents,
    overdueCount,
    overdueCents,
    averageTicketCents:
      paidIncomeCount > 0
        ? Math.round(totalIncomeReceivedCents / paidIncomeCount)
        : 0,
  };
}

