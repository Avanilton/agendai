import { describe, it, expect } from "vitest";
import {
  calculateAppointmentTotals,
  detectScheduleConflict,
  intervalsOverlap,
} from "@/modules/agenda/conflicts";
import {
  appointmentInputSchema,
  scheduleBlockInputSchema,
} from "@/modules/agenda/schemas";
import { generateRecurrenceDates } from "@/modules/agenda/service";

describe("Agenda Conflict Engine", () => {
  const t = (hm: string) => new Date(`2026-11-26T${hm}:00-03:00`);

  it("allows adjacent time slots without false conflict", () => {
    expect(
      intervalsOverlap(
        { startsAt: t("09:00"), endsAt: t("10:00") },
        { startsAt: t("10:00"), endsAt: t("11:00") }
      )
    ).toBe(false);
  });

  it("detects overlapping active appointment", () => {
    const result = detectScheduleConflict({
      proposed: { startsAt: t("09:30"), endsAt: t("10:30") },
      existingAppointments: [
        {
          id: "appt-1",
          startsAt: t("09:00"),
          endsAt: t("10:00"),
          status: "confirmed",
        },
      ],
      scheduleBlocks: [],
    });

    expect(result.hasConflict).toBe(true);
    expect(result.reason).toBe("appointment");
    expect(result.conflictingId).toBe("appt-1");
  });

  it("ignores cancelled and no_show appointments and self when rescheduling", () => {
    const result = detectScheduleConflict({
      proposed: { startsAt: t("09:00"), endsAt: t("10:00") },
      existingAppointments: [
        { id: "appt-cancelled", startsAt: t("09:00"), endsAt: t("10:00"), status: "cancelled" },
        { id: "appt-noshow", startsAt: t("09:00"), endsAt: t("10:00"), status: "no_show" },
        { id: "appt-self", startsAt: t("09:00"), endsAt: t("10:00"), status: "confirmed" },
      ],
      scheduleBlocks: [],
      ignoreAppointmentId: "appt-self",
    });

    expect(result.hasConflict).toBe(false);
  });

  it("blocks scheduling during vacations, holidays, or schedule blocks", () => {
    const result = detectScheduleConflict({
      proposed: { startsAt: t("14:00"), endsAt: t("15:00") },
      existingAppointments: [],
      scheduleBlocks: [
        {
          id: "blk-1",
          startsAt: t("12:00"),
          endsAt: t("16:00"),
          title: "Feriado Municipal",
        },
      ],
    });

    expect(result.hasConflict).toBe(true);
    expect(result.reason).toBe("block");
    expect(result.message).toContain("Feriado Municipal");
  });
});

describe("Multi-service Totals & Agenda Schemas", () => {
  it("sums duration, buffer, and price across multiple services", () => {
    const totals = calculateAppointmentTotals([
      { priceCents: 12000, durationMinutes: 40, bufferMinutes: 10 },
      { priceCents: 8000, durationMinutes: 30, bufferMinutes: 5 },
    ]);

    expect(totals.totalDurationMinutes).toBe(85);
    expect(totals.totalPriceCents).toBe(20000);
  });

  it("validates appointment and schedule block schemas", () => {
    const uuid = "11111111-1111-4111-8111-111111111111";
    expect(
      appointmentInputSchema.safeParse({
        clientId: uuid,
        professionalId: uuid,
        serviceIds: [uuid],
        date: "2026-11-26",
        startTime: "10:00",
      }).success
    ).toBe(true);

    expect(
      appointmentInputSchema.safeParse({
        clientId: uuid,
        professionalId: uuid,
        serviceIds: [],
        date: "2026-11-26",
        startTime: "10:00",
      }).success
    ).toBe(false);

    expect(
      scheduleBlockInputSchema.safeParse({
        type: "holiday",
        title: "Natal",
        startDate: "2026-12-25",
        startTime: "00:00",
        endDate: "2026-12-25",
        endTime: "23:59",
      }).success
    ).toBe(true);
  });

  it("generates custom Livre recurrence dates for monthly day 15 and weekly Thursday", () => {
    // Monthly on day 15 starting 2026-11-10 -> Nov 15, Dec 15, Jan 15
    const monthlyDates = generateRecurrenceDates({
      startDate: "2026-11-10",
      frequency: "custom",
      customUnit: "monthly",
      customDayOfMonth: 15,
      endType: "until_date",
      untilDate: "2027-01-20",
    });
    expect(monthlyDates).toEqual(["2026-11-15", "2026-12-15", "2027-01-15"]);

    // Weekly on Thursday (4) starting Monday 2026-11-23 -> Nov 26, Dec 03, Dec 10
    const weeklyDates = generateRecurrenceDates({
      startDate: "2026-11-23",
      frequency: "custom",
      customUnit: "weekly",
      customDayOfWeek: 4,
      endType: "until_date",
      untilDate: "2026-12-12",
    });
    expect(weeklyDates).toEqual(["2026-11-26", "2026-12-03", "2026-12-10"]);
  });
});

