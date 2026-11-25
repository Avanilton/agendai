import {
  detectScheduleConflict,
  type ConflictCheckCandidate,
} from "@/modules/agenda/conflicts";

export interface DayAvailabilityRule {
  isActive: boolean;
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  breakStartTime?: string | null;
  breakEndTime?: string | null;
}

export interface SlotGenerationInput {
  /** YYYY-MM-DD in America/Sao_Paulo */
  dateStr: string;
  rule: DayAvailabilityRule;
  slotIntervalMinutes: number;
  serviceTotalMinutes: number;
  minAdvanceMinutes: number;
  maxAdvanceDays: number;
  now: Date;
  existingAppointments: ConflictCheckCandidate[];
  scheduleBlocks: ConflictCheckCandidate[];
}

function parseHmToMinutes(hm: string): number {
  const [h, m] = hm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function minutesToHm(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Pure slot generator for a single professional on a single day.
 * Returns available "HH:mm" strings sorted chronologically.
 */
export function generateAvailableSlots(input: SlotGenerationInput): string[] {
  const {
    dateStr,
    rule,
    slotIntervalMinutes,
    serviceTotalMinutes,
    minAdvanceMinutes,
    maxAdvanceDays,
    now,
    existingAppointments,
    scheduleBlocks,
  } = input;

  if (!rule.isActive) return [];

  const startMin = parseHmToMinutes(rule.startTime);
  const endMin = parseHmToMinutes(rule.endTime);
  if (endMin <= startMin || serviceTotalMinutes <= 0) return [];

  // Enforce maxAdvanceDays window
  const dayStartUtc = new Date(`${dateStr}T00:00:00-03:00`);
  const maxDateUtc = new Date(now.getTime() + maxAdvanceDays * 24 * 60 * 60_000);
  if (dayStartUtc.getTime() > maxDateUtc.getTime()) {
    return [];
  }

  const earliestAllowedMs = now.getTime() + minAdvanceMinutes * 60_000;
  const step = Math.max(5, slotIntervalMinutes);

  const hasBreak = Boolean(rule.breakStartTime && rule.breakEndTime);
  const breakStartMin = hasBreak ? parseHmToMinutes(rule.breakStartTime!) : -1;
  const breakEndMin = hasBreak ? parseHmToMinutes(rule.breakEndTime!) : -1;

  const available: string[] = [];

  for (
    let cursor = startMin;
    cursor + serviceTotalMinutes <= endMin;
    cursor += step
  ) {
    const slotEndMin = cursor + serviceTotalMinutes;

    // Exclude slots overlapping the configured break window
    if (hasBreak && breakEndMin > breakStartMin) {
      if (cursor < breakEndMin && slotEndMin > breakStartMin) {
        continue;
      }
    }

    const hm = minutesToHm(cursor);
    const startsAt = new Date(`${dateStr}T${hm}:00-03:00`);
    const endsAt = new Date(startsAt.getTime() + serviceTotalMinutes * 60_000);

    // Enforce minimum advance notice
    if (startsAt.getTime() < earliestAllowedMs) {
      continue;
    }

    const conflict = detectScheduleConflict({
      proposed: { startsAt, endsAt },
      existingAppointments,
      scheduleBlocks,
    });

    if (!conflict.hasConflict) {
      available.push(hm);
    }
  }

  return available;
}

/**
 * Merges available slots across multiple professionals (for "Any available professional").
 */
export function mergeMultiProfessionalSlots(
  slotsPerProfessional: string[][]
): string[] {
  const unique = new Set<string>();
  for (const list of slotsPerProfessional) {
    for (const slot of list) {
      unique.add(slot);
    }
  }
  return Array.from(unique).sort();
}

