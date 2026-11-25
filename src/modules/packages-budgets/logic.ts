export interface PackageHealthInput {
  totalSessions: number;
  usedSessions: number;
  expiresAt: string | null;
  status: "active" | "completed" | "expired" | "cancelled";
}

export interface PackageHealth {
  remainingSessions: number;
  isExpired: boolean;
  isExpiringSoon: boolean;
  isLowSessions: boolean;
  canConsumeSession: boolean;
}

export function evaluatePackageHealth(
  pkg: PackageHealthInput,
  todayDateStr: string
): PackageHealth {
  const remainingSessions = Math.max(0, pkg.totalSessions - pkg.usedSessions);
  const isExpired =
    pkg.status === "expired" ||
    Boolean(pkg.expiresAt && pkg.expiresAt < todayDateStr);

  let isExpiringSoon = false;
  if (pkg.expiresAt && !isExpired) {
    const todayMs = new Date(`${todayDateStr}T00:00:00Z`).getTime();
    const expMs = new Date(`${pkg.expiresAt}T00:00:00Z`).getTime();
    const diffDays = Math.round((expMs - todayMs) / (24 * 60 * 60_000));
    isExpiringSoon = diffDays >= 0 && diffDays <= 15;
  }

  const isLowSessions =
    pkg.status === "active" && remainingSessions > 0 && remainingSessions <= 2;

  const canConsumeSession =
    pkg.status === "active" && !isExpired && remainingSessions > 0;

  return {
    remainingSessions,
    isExpired,
    isExpiringSoon,
    isLowSessions,
    canConsumeSession,
  };
}

