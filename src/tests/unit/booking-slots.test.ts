import { describe, it, expect } from "vitest";
import {
  generateAvailableSlots,
  mergeMultiProfessionalSlots,
} from "@/modules/booking/slots";
import {
  bookingSettingsSchema,
  publicBookingSubmitSchema,
} from "@/modules/booking/schemas";

describe("Online Booking Slot Engine", () => {
  const dateStr = "2026-12-01";
  const nowBeforeDay = new Date("2026-11-30T10:00:00-03:00");

  it("generates slots within business hours excluding lunch break and active appointments", () => {
    const slots = generateAvailableSlots({
      dateStr,
      rule: {
        isActive: true,
        startTime: "09:00",
        endTime: "14:00",
        breakStartTime: "12:00",
        breakEndTime: "13:00",
      },
      slotIntervalMinutes: 30,
      serviceTotalMinutes: 60,
      minAdvanceMinutes: 60,
      maxAdvanceDays: 30,
      now: nowBeforeDay,
      existingAppointments: [
        {
          id: "a1",
          startsAt: new Date(`${dateStr}T10:00:00-03:00`),
          endsAt: new Date(`${dateStr}T11:00:00-03:00`),
          status: "confirmed",
        },
        {
          id: "a2",
          startsAt: new Date(`${dateStr}T11:00:00-03:00`),
          endsAt: new Date(`${dateStr}T12:00:00-03:00`),
          status: "cancelled", // should NOT block
        },
      ],
      scheduleBlocks: [],
    });

    // 09:00 fits before 10:00; 09:30 & 10:00 & 10:30 collide with 10:00-11:00;
    // 11:00 fits before 12:00 break; 11:30-12:30 collides with break; 13:00 fits before 14:00
    expect(slots).toEqual(["09:00", "11:00", "13:00"]);
  });

  it("enforces minimum advance notice and maxAdvanceDays", () => {
    const nowSameDay = new Date(`${dateStr}T09:30:00-03:00`);
    const slotsSameDay = generateAvailableSlots({
      dateStr,
      rule: { isActive: true, startTime: "09:00", endTime: "12:00" },
      slotIntervalMinutes: 30,
      serviceTotalMinutes: 30,
      minAdvanceMinutes: 60, // earliest allowed = 10:30
      maxAdvanceDays: 30,
      now: nowSameDay,
      existingAppointments: [],
      scheduleBlocks: [],
    });
    expect(slotsSameDay).toEqual(["10:30", "11:00", "11:30"]);

    const farFutureSlots = generateAvailableSlots({
      dateStr: "2027-06-01",
      rule: { isActive: true, startTime: "09:00", endTime: "12:00" },
      slotIntervalMinutes: 30,
      serviceTotalMinutes: 30,
      minAdvanceMinutes: 60,
      maxAdvanceDays: 15,
      now: nowBeforeDay,
      existingAppointments: [],
      scheduleBlocks: [],
    });
    expect(farFutureSlots).toEqual([]);
  });

  it("excludes schedule blocks and merges multi-professional slots cleanly", () => {
    const slots = generateAvailableSlots({
      dateStr,
      rule: { isActive: true, startTime: "09:00", endTime: "11:00" },
      slotIntervalMinutes: 30,
      serviceTotalMinutes: 30,
      minAdvanceMinutes: 0,
      maxAdvanceDays: 30,
      now: nowBeforeDay,
      existingAppointments: [],
      scheduleBlocks: [
        {
          id: "blk-1",
          startsAt: new Date(`${dateStr}T09:30:00-03:00`),
          endsAt: new Date(`${dateStr}T10:30:00-03:00`),
          title: "Reunião",
        },
      ],
    });
    expect(slots).toEqual(["09:00", "10:30"]);

    expect(
      mergeMultiProfessionalSlots([
        ["10:00", "09:00"],
        ["09:30", "10:00"],
      ])
    ).toEqual(["09:00", "09:30", "10:00"]);
  });
});

describe("Public Booking & Settings Schemas", () => {
  it("requires LGPD acceptance on public booking submission", () => {
    const uuid = "11111111-1111-4111-8111-111111111111";
    expect(
      publicBookingSubmitSchema.safeParse({
        serviceId: uuid,
        professionalId: "any",
        date: "2026-12-01",
        time: "10:00",
        clientName: "João Pereira",
        clientPhone: "(11) 98888-7777",
        acceptedLgpd: true,
      }).success
    ).toBe(true);

    expect(
      publicBookingSubmitSchema.safeParse({
        serviceId: uuid,
        professionalId: "any",
        date: "2026-12-01",
        time: "10:00",
        clientName: "João Pereira",
        clientPhone: "(11) 98888-7777",
        acceptedLgpd: false,
      }).success
    ).toBe(false);
  });

  it("validates allowed booking slot intervals", () => {
    expect(bookingSettingsSchema.safeParse({ slotIntervalMinutes: 30 }).success).toBe(true);
    expect(bookingSettingsSchema.safeParse({ slotIntervalMinutes: 17 }).success).toBe(false);
  });
});

