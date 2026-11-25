export type AppointmentStatus =
  | "waiting"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show";

export const INACTIVE_APPOINTMENT_STATUSES: ReadonlySet<AppointmentStatus> =
  new Set(["cancelled", "no_show"]);

export interface TimeInterval {
  startsAt: Date;
  endsAt: Date;
}

/**
 * Checks whether two half-open intervals [aStart, aEnd) and [bStart, bEnd) overlap.
 * Adjacent slots (e.g. 09:00-10:00 and 10:00-11:00) do NOT conflict.
 */
export function intervalsOverlap(a: TimeInterval, b: TimeInterval): boolean {
  return a.startsAt.getTime() < b.endsAt.getTime() && a.endsAt.getTime() > b.startsAt.getTime();
}

export interface ConflictCheckCandidate {
  id: string;
  startsAt: Date;
  endsAt: Date;
  status?: AppointmentStatus;
  title?: string;
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  reason: "none" | "appointment" | "block";
  conflictingId?: string;
  message?: string;
}

export function detectScheduleConflict(params: {
  proposed: TimeInterval;
  existingAppointments: ConflictCheckCandidate[];
  scheduleBlocks: ConflictCheckCandidate[];
  ignoreAppointmentId?: string;
}): ConflictCheckResult {
  const { proposed, existingAppointments, scheduleBlocks, ignoreAppointmentId } =
    params;

  if (proposed.endsAt.getTime() <= proposed.startsAt.getTime()) {
    return {
      hasConflict: true,
      reason: "block",
      message: "O horário de término deve ser posterior ao horário de início.",
    };
  }

  for (const block of scheduleBlocks) {
    if (intervalsOverlap(proposed, block)) {
      return {
        hasConflict: true,
        reason: "block",
        conflictingId: block.id,
        message: block.title
          ? `Conflito com bloqueio de agenda: "${block.title}".`
          : "O horário selecionado está bloqueado na agenda.",
      };
    }
  }

  for (const appt of existingAppointments) {
    if (ignoreAppointmentId && appt.id === ignoreAppointmentId) continue;
    if (appt.status && INACTIVE_APPOINTMENT_STATUSES.has(appt.status)) continue;

    if (intervalsOverlap(proposed, appt)) {
      return {
        hasConflict: true,
        reason: "appointment",
        conflictingId: appt.id,
        message:
          "Já existe um agendamento ativo para este profissional nesse horário.",
      };
    }
  }

  return { hasConflict: false, reason: "none" };
}

export interface ServiceSelectionItem {
  priceCents: number;
  durationMinutes: number;
  bufferMinutes?: number;
}

export function calculateAppointmentTotals(items: ServiceSelectionItem[]): {
  totalDurationMinutes: number;
  totalPriceCents: number;
} {
  if (items.length === 0) {
    return { totalDurationMinutes: 30, totalPriceCents: 0 };
  }

  let totalDurationMinutes = 0;
  let totalPriceCents = 0;

  for (const item of items) {
    totalDurationMinutes += item.durationMinutes + (item.bufferMinutes ?? 0);
    totalPriceCents += item.priceCents;
  }

  return {
    totalDurationMinutes: Math.max(5, totalDurationMinutes),
    totalPriceCents: Math.max(0, totalPriceCents),
  };
}

