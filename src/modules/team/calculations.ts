/**
 * Pure commission calculator in integer cents.
 * Supports percentage (in basis points, e.g. 3000 = 30.00%) and fixed value.
 */
export function calculateCommissionCents(params: {
  calcType: "percentage" | "fixed";
  baseAmountCents: number;
  rateBps?: number;
  fixedAmountCents?: number;
}): number {
  if (params.calcType === "fixed") {
    return Math.max(0, Math.round(params.fixedAmountCents ?? 0));
  }
  const base = Math.max(0, params.baseAmountCents);
  const bps = Math.max(0, Math.min(10000, params.rateBps ?? 0));
  return Math.round((base * bps) / 10000);
}

export interface CommissionSummaryRow {
  status: "pending" | "paid" | "cancelled";
  commissionAmountCents: number;
}

export function summarizeCommissions(rows: CommissionSummaryRow[]): {
  pendingCents: number;
  paidCents: number;
  totalActiveCents: number;
  pendingCount: number;
} {
  let pendingCents = 0;
  let paidCents = 0;
  let pendingCount = 0;

  for (const r of rows) {
    if (r.status === "pending") {
      pendingCents += r.commissionAmountCents;
      pendingCount++;
    } else if (r.status === "paid") {
      paidCents += r.commissionAmountCents;
    }
  }

  return {
    pendingCents,
    paidCents,
    totalActiveCents: pendingCents + paidCents,
    pendingCount,
  };
}

export function computeGoalProgressPercent(
  achieved: number,
  target: number
): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((achieved / target) * 100));
}

