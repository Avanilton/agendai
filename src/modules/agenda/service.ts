import { and, asc, eq, gte, inArray, isNull, lte, or } from "drizzle-orm";
import { getDb } from "@/db";
import {
  appointments,
  appointmentServices,
  availabilityRules,
  clients,
  professionals,
  scheduleBlocks,
  services,
} from "@/db/schema";
import { assertTenantOwnership } from "@/lib/tenant/context";
import { logAudit } from "@/lib/security/audit";
import {
  calculateAppointmentTotals,
  detectScheduleConflict,
  type AppointmentStatus,
} from "./conflicts";
import type { AppointmentInput, ScheduleBlockInput } from "./schemas";

/**
 * Parses a local Brazil date + HH:mm into a UTC Date (America/Sao_Paulo -03:00 default).
 */
export function buildBrazilTimestamp(dateStr: string, timeStr: string): Date {
  return new Date(`${dateStr}T${timeStr}:00-03:00`);
}

export async function listAppointmentsInRange(params: {
  organizationId: string;
  rangeStart: Date;
  rangeEnd: Date;
  professionalId?: string;
}) {
  const db = getDb();
  const conditions = [
    eq(appointments.organizationId, params.organizationId),
    isNull(appointments.deletedAt),
    gte(appointments.startsAt, params.rangeStart),
    lte(appointments.startsAt, params.rangeEnd),
  ];

  if (params.professionalId) {
    conditions.push(eq(appointments.professionalId, params.professionalId));
  }

  const rows = await db
    .select({
      id: appointments.id,
      clientId: appointments.clientId,
      clientName: clients.name,
      clientWhatsapp: clients.whatsapp,
      clientPhoneRaw: clients.phone,
      clientEmail: clients.email,
      clientBirthDate: clients.birthDate,
      professionalId: appointments.professionalId,
      professionalName: professionals.name,
      professionalColor: professionals.color,
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
      durationMinutes: appointments.durationMinutes,
      totalPriceCents: appointments.totalPriceCents,
      status: appointments.status,
      isOverbooking: appointments.isOverbooking,
      source: appointments.source,
      recurrenceGroupId: appointments.recurrenceGroupId,
      recurrenceRule: appointments.recurrenceRule,
      notes: appointments.notes,
      cancellationReason: appointments.cancellationReason,
    })
    .from(appointments)
    .innerJoin(clients, eq(appointments.clientId, clients.id))
    .innerJoin(professionals, eq(appointments.professionalId, professionals.id))
    .where(and(...conditions))
    .orderBy(asc(appointments.startsAt));

  if (rows.length === 0) return [];

  const apptIds = rows.map((r) => r.id);
  const serviceLinks = await db
    .select({
      appointmentId: appointmentServices.appointmentId,
      serviceId: appointmentServices.serviceId,
      serviceName: appointmentServices.serviceNameSnapshot,
      priceCents: appointmentServices.priceCents,
      durationMinutes: appointmentServices.durationMinutes,
    })
    .from(appointmentServices)
    .where(
      and(
        eq(appointmentServices.organizationId, params.organizationId),
        inArray(appointmentServices.appointmentId, apptIds)
      )
    )
    .orderBy(asc(appointmentServices.sortOrder));

  const byAppt = new Map<
    string,
    { serviceId: string; serviceName: string; priceCents: number; durationMinutes: number }[]
  >();
  for (const link of serviceLinks) {
    const list = byAppt.get(link.appointmentId) ?? [];
    list.push({
      serviceId: link.serviceId,
      serviceName: link.serviceName,
      priceCents: link.priceCents,
      durationMinutes: link.durationMinutes,
    });
    byAppt.set(link.appointmentId, list);
  }

  return rows.map((row) => ({
    id: row.id,
    clientId: row.clientId,
    clientName: row.clientName,
    clientPhone: row.clientWhatsapp || row.clientPhoneRaw,
    clientEmail: row.clientEmail,
    clientBirthDate: row.clientBirthDate,
    professionalId: row.professionalId,
    professionalName: row.professionalName,
    professionalColor: row.professionalColor,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    durationMinutes: row.durationMinutes,
    totalPriceCents: row.totalPriceCents,
    status: row.status,
    isOverbooking: row.isOverbooking,
    source: row.source,
    recurrenceGroupId: row.recurrenceGroupId,
    recurrenceRule: row.recurrenceRule,
    notes: row.notes,
    cancellationReason: row.cancellationReason,
    startsAtIso: row.startsAt.toISOString(),
    endsAtIso: row.endsAt.toISOString(),
    services: byAppt.get(row.id) ?? [],
  }));
}

export async function listOpenFutureAppointments(organizationId: string) {
  const db = getDb();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")?.value ?? "2026";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  const startOfToday = new Date(`${y}-${m}-${d}T00:00:00-03:00`);

  const rows = await db
    .select({
      id: appointments.id,
      clientId: appointments.clientId,
      clientName: clients.name,
      clientWhatsapp: clients.whatsapp,
      clientPhoneRaw: clients.phone,
      clientEmail: clients.email,
      clientBirthDate: clients.birthDate,
      professionalId: appointments.professionalId,
      professionalName: professionals.name,
      professionalColor: professionals.color,
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
      durationMinutes: appointments.durationMinutes,
      totalPriceCents: appointments.totalPriceCents,
      status: appointments.status,
      isOverbooking: appointments.isOverbooking,
      source: appointments.source,
      recurrenceGroupId: appointments.recurrenceGroupId,
      recurrenceRule: appointments.recurrenceRule,
      notes: appointments.notes,
      cancellationReason: appointments.cancellationReason,
    })
    .from(appointments)
    .innerJoin(clients, eq(appointments.clientId, clients.id))
    .innerJoin(professionals, eq(appointments.professionalId, professionals.id))
    .where(
      and(
        eq(appointments.organizationId, organizationId),
        isNull(appointments.deletedAt),
        gte(appointments.startsAt, startOfToday),
        inArray(appointments.status, ["waiting", "confirmed", "in_progress"])
      )
    )
    .orderBy(asc(appointments.startsAt))
    .limit(100);

  if (rows.length === 0) return [];

  const apptIds = rows.map((r) => r.id);
  const serviceLinks = await db
    .select({
      appointmentId: appointmentServices.appointmentId,
      serviceId: appointmentServices.serviceId,
      serviceName: appointmentServices.serviceNameSnapshot,
      priceCents: appointmentServices.priceCents,
      durationMinutes: appointmentServices.durationMinutes,
    })
    .from(appointmentServices)
    .where(
      and(
        eq(appointmentServices.organizationId, organizationId),
        inArray(appointmentServices.appointmentId, apptIds)
      )
    )
    .orderBy(asc(appointmentServices.sortOrder));

  const byAppt = new Map<
    string,
    { serviceId: string; serviceName: string; priceCents: number; durationMinutes: number }[]
  >();
  for (const link of serviceLinks) {
    const list = byAppt.get(link.appointmentId) ?? [];
    list.push({
      serviceId: link.serviceId,
      serviceName: link.serviceName,
      priceCents: link.priceCents,
      durationMinutes: link.durationMinutes,
    });
    byAppt.set(link.appointmentId, list);
  }

  return rows.map((row) => ({
    id: row.id,
    clientId: row.clientId,
    clientName: row.clientName,
    clientPhone: row.clientWhatsapp || row.clientPhoneRaw,
    clientEmail: row.clientEmail,
    clientBirthDate: row.clientBirthDate,
    professionalId: row.professionalId,
    professionalName: row.professionalName,
    professionalColor: row.professionalColor,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    durationMinutes: row.durationMinutes,
    totalPriceCents: row.totalPriceCents,
    status: row.status,
    isOverbooking: row.isOverbooking,
    source: row.source,
    recurrenceGroupId: row.recurrenceGroupId,
    recurrenceRule: row.recurrenceRule,
    notes: row.notes,
    cancellationReason: row.cancellationReason,
    startsAtIso: row.startsAt.toISOString(),
    endsAtIso: row.endsAt.toISOString(),
    services: byAppt.get(row.id) ?? [],
  }));
}

function generateRecurrenceDates(params: {
  startDate: string;
  frequency: "daily" | "weekly" | "biweekly" | "monthly";
  endType: "until_date" | "no_end";
  untilDate?: string;
}): string[] {
  const { startDate, frequency, endType, untilDate } = params;
  const maxOccurrences = endType === "no_end" ? 12 : 52;
  const dates: string[] = [startDate];

  const [y0, m0, d0] = startDate.split("-").map(Number);
  if (!y0 || !m0 || !d0) return dates;

  for (let i = 1; i < maxOccurrences; i++) {
    let nextDate: Date;
    if (frequency === "monthly") {
      const targetMonth = m0 - 1 + i;
      const targetYear = y0 + Math.floor(targetMonth / 12);
      const normMonth = ((targetMonth % 12) + 12) % 12;
      const lastDay = new Date(Date.UTC(targetYear, normMonth + 1, 0)).getUTCDate();
      nextDate = new Date(
        Date.UTC(targetYear, normMonth, Math.min(d0, lastDay), 15, 0, 0)
      );
    } else {
      const stepDays =
        frequency === "daily" ? 1 : frequency === "biweekly" ? 14 : 7;
      nextDate = new Date(Date.UTC(y0, m0 - 1, d0 + i * stepDays, 15, 0, 0));
    }

    const yyyy = nextDate.getUTCFullYear();
    const mm = String(nextDate.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(nextDate.getUTCDate()).padStart(2, "0");
    const key = `${yyyy}-${mm}-${dd}`;

    if (endType === "until_date" && untilDate && key > untilDate) {
      break;
    }
    dates.push(key);
  }

  return dates;
}

export async function createOrUpdateAppointment(params: {
  organizationId: string;
  actorUserId: string;
  canOverbook: boolean;
  appointmentId?: string;
  input: AppointmentInput;
}) {
  const db = getDb();
  const { organizationId, actorUserId, canOverbook, appointmentId, input } =
    params;

  if (appointmentId) {
    const [existing] = await db
      .select({
        id: appointments.id,
        organizationId: appointments.organizationId,
      })
      .from(appointments)
      .where(and(eq(appointments.id, appointmentId), isNull(appointments.deletedAt)))
      .limit(1);
    assertTenantOwnership(existing?.organizationId, organizationId);
  }

  // Validate cross-tenant ownership of client, professional, and services
  const [clientRow] = await db
    .select({ id: clients.id, organizationId: clients.organizationId })
    .from(clients)
    .where(and(eq(clients.id, input.clientId), isNull(clients.deletedAt)))
    .limit(1);
  assertTenantOwnership(clientRow?.organizationId, organizationId);

  const [profRow] = await db
    .select({ id: professionals.id, organizationId: professionals.organizationId })
    .from(professionals)
    .where(
      and(eq(professionals.id, input.professionalId), isNull(professionals.deletedAt))
    )
    .limit(1);
  assertTenantOwnership(profRow?.organizationId, organizationId);

  const uniqueServiceIds = Array.from(new Set(input.serviceIds));
  const serviceRows = await db
    .select()
    .from(services)
    .where(
      and(
        eq(services.organizationId, organizationId),
        inArray(services.id, uniqueServiceIds),
        isNull(services.deletedAt)
      )
    );

  if (serviceRows.length !== uniqueServiceIds.length) {
    throw new Error("Um ou mais serviços selecionados não pertencem a esta organização.");
  }

  const computed = calculateAppointmentTotals(serviceRows);
  const durationMinutes = input.durationMinutes ?? computed.totalDurationMinutes;
  const totalPriceCents =
    input.totalPriceReais !== undefined
      ? Math.round(input.totalPriceReais * 100)
      : computed.totalPriceCents;

  const occurrenceDates =
    !appointmentId && input.recurrenceEnabled
      ? generateRecurrenceDates({
          startDate: input.date,
          frequency: input.recurrenceFrequency ?? "weekly",
          endType: input.recurrenceEndType ?? "no_end",
          untilDate: input.recurrenceUntilDate || undefined,
        })
      : [input.date];

  const recurrenceGroupId =
    !appointmentId && input.recurrenceEnabled && occurrenceDates.length > 1
      ? crypto.randomUUID()
      : null;
  const recurrenceRule =
    !appointmentId && input.recurrenceEnabled
      ? `${input.recurrenceFrequency ?? "weekly"}:${input.recurrenceEndType === "until_date" && input.recurrenceUntilDate ? input.recurrenceUntilDate : "no_end"}`
      : null;

  let firstSavedId: string | undefined = appointmentId;
  let createdCount = 0;
  let skippedCount = 0;

  for (let idx = 0; idx < occurrenceDates.length; idx++) {
    const occDate = occurrenceDates[idx]!;
    const startsAt = buildBrazilTimestamp(occDate, input.startTime);
    const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);

    const dayStart = new Date(startsAt.getTime() - 24 * 60 * 60_000);
    const dayEnd = new Date(endsAt.getTime() + 24 * 60 * 60_000);

    const [existingAppts, blocks] = await Promise.all([
      db
        .select({
          id: appointments.id,
          startsAt: appointments.startsAt,
          endsAt: appointments.endsAt,
          status: appointments.status,
        })
        .from(appointments)
        .where(
          and(
            eq(appointments.organizationId, organizationId),
            eq(appointments.professionalId, input.professionalId),
            isNull(appointments.deletedAt),
            gte(appointments.endsAt, dayStart),
            lte(appointments.startsAt, dayEnd)
          )
        ),
      db
        .select({
          id: scheduleBlocks.id,
          startsAt: scheduleBlocks.startsAt,
          endsAt: scheduleBlocks.endsAt,
          title: scheduleBlocks.title,
        })
        .from(scheduleBlocks)
        .where(
          and(
            eq(scheduleBlocks.organizationId, organizationId),
            isNull(scheduleBlocks.deletedAt),
            or(
              eq(scheduleBlocks.professionalId, input.professionalId),
              isNull(scheduleBlocks.professionalId)
            )!,
            gte(scheduleBlocks.endsAt, dayStart),
            lte(scheduleBlocks.startsAt, dayEnd)
          )
        ),
    ]);

    const conflict = detectScheduleConflict({
      proposed: { startsAt, endsAt },
      existingAppointments: existingAppts,
      scheduleBlocks: blocks,
      ignoreAppointmentId: appointmentId,
    });

    if (conflict.hasConflict) {
      if (conflict.reason === "appointment" && input.allowOverbooking) {
        if (!canOverbook) {
          throw new Error(
            "Você não tem permissão para realizar encaixes em horários já ocupados."
          );
        }
      } else if (idx === 0) {
        throw new Error(conflict.message || "Conflito de horário detectado.");
      } else {
        skippedCount++;
        continue;
      }
    }

    let savedId = appointmentId;

    if (appointmentId) {
      await db
        .update(appointments)
        .set({
          clientId: input.clientId,
          professionalId: input.professionalId,
          startsAt,
          endsAt,
          durationMinutes,
          totalPriceCents,
          status: input.status,
          isOverbooking: conflict.hasConflict && input.allowOverbooking,
          notes: input.notes || null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(appointments.id, appointmentId),
            eq(appointments.organizationId, organizationId)
          )
        );

      await db
        .delete(appointmentServices)
        .where(
          and(
            eq(appointmentServices.appointmentId, appointmentId),
            eq(appointmentServices.organizationId, organizationId)
          )
        );
    } else {
      const [inserted] = await db
        .insert(appointments)
        .values({
          organizationId,
          clientId: input.clientId,
          professionalId: input.professionalId,
          startsAt,
          endsAt,
          durationMinutes,
          totalPriceCents,
          status: input.status,
          isOverbooking: conflict.hasConflict && input.allowOverbooking,
          source: "internal",
          recurrenceGroupId,
          recurrenceRule,
          notes: input.notes || null,
          createdByUserId: actorUserId,
        })
        .returning();

      savedId = inserted!.id;
      if (!firstSavedId) firstSavedId = savedId;
    }

    await db.insert(appointmentServices).values(
      serviceRows.map((svc, sIdx) => ({
        organizationId,
        appointmentId: savedId!,
        serviceId: svc.id,
        serviceNameSnapshot: svc.name,
        priceCents: svc.priceCents,
        durationMinutes: svc.durationMinutes,
        sortOrder: sIdx,
      }))
    );

    createdCount++;
  }

  await logAudit({
    organizationId,
    actorUserId,
    action: appointmentId ? "appointment.updated" : "appointment.created",
    resourceType: "appointment",
    resourceId: firstSavedId!,
    metadata: {
      status: input.status,
      serviceCount: serviceRows.length,
      createdCount,
      skippedCount,
      recurrenceRule,
    },
  });

  return { id: firstSavedId!, createdCount, skippedCount };
}

export async function updateAppointmentStatus(params: {
  organizationId: string;
  actorUserId: string;
  appointmentId: string;
  status: AppointmentStatus;
  cancellationReason?: string;
}) {
  const db = getDb();
  const { organizationId, actorUserId, appointmentId, status, cancellationReason } =
    params;

  const [existing] = await db
    .select({ id: appointments.id, organizationId: appointments.organizationId })
    .from(appointments)
    .where(and(eq(appointments.id, appointmentId), isNull(appointments.deletedAt)))
    .limit(1);

  assertTenantOwnership(existing?.organizationId, organizationId);

  await db
    .update(appointments)
    .set({
      status,
      cancellationReason:
        status === "cancelled" ? cancellationReason || null : null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(appointments.id, appointmentId),
        eq(appointments.organizationId, organizationId)
      )
    );

  await logAudit({
    organizationId,
    actorUserId,
    action: status === "cancelled" ? "appointment.cancelled" : "appointment.status_changed",
    resourceType: "appointment",
    resourceId: appointmentId,
    metadata: { status },
  });
}

export async function listAvailabilityRules(
  organizationId: string,
  professionalId?: string | null
) {
  const db = getDb();
  return db
    .select()
    .from(availabilityRules)
    .where(
      and(
        eq(availabilityRules.organizationId, organizationId),
        professionalId
          ? eq(availabilityRules.professionalId, professionalId)
          : isNull(availabilityRules.professionalId)
      )
    )
    .orderBy(asc(availabilityRules.dayOfWeek));
}

export async function saveAvailabilityRules(params: {
  organizationId: string;
  actorUserId: string;
  professionalId?: string | null;
  rules: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    breakStartTime?: string;
    breakEndTime?: string;
    isActive: boolean;
  }[];
}) {
  const db = getDb();
  const { organizationId, actorUserId, professionalId, rules } = params;

  if (professionalId) {
    const [prof] = await db
      .select({ id: professionals.id, organizationId: professionals.organizationId })
      .from(professionals)
      .where(and(eq(professionals.id, professionalId), isNull(professionals.deletedAt)))
      .limit(1);
    assertTenantOwnership(prof?.organizationId, organizationId);
  }

  await db
    .delete(availabilityRules)
    .where(
      and(
        eq(availabilityRules.organizationId, organizationId),
        professionalId
          ? eq(availabilityRules.professionalId, professionalId)
          : isNull(availabilityRules.professionalId)
      )
    );

  await db.insert(availabilityRules).values(
    rules.map((r) => ({
      organizationId,
      professionalId: professionalId || null,
      dayOfWeek: r.dayOfWeek,
      startTime: r.startTime,
      endTime: r.endTime,
      breakStartTime: r.breakStartTime || null,
      breakEndTime: r.breakEndTime || null,
      isActive: r.isActive,
    }))
  );

  await logAudit({
    organizationId,
    actorUserId,
    action: "availability.updated",
    resourceType: "availability_rules",
    resourceId: professionalId || organizationId,
  });
}

export async function listScheduleBlocks(organizationId: string) {
  const db = getDb();
  return db
    .select({
      id: scheduleBlocks.id,
      professionalId: scheduleBlocks.professionalId,
      professionalName: professionals.name,
      type: scheduleBlocks.type,
      title: scheduleBlocks.title,
      startsAt: scheduleBlocks.startsAt,
      endsAt: scheduleBlocks.endsAt,
      notes: scheduleBlocks.notes,
    })
    .from(scheduleBlocks)
    .leftJoin(professionals, eq(scheduleBlocks.professionalId, professionals.id))
    .where(
      and(
        eq(scheduleBlocks.organizationId, organizationId),
        isNull(scheduleBlocks.deletedAt)
      )
    )
    .orderBy(asc(scheduleBlocks.startsAt));
}

export async function createScheduleBlock(params: {
  organizationId: string;
  actorUserId: string;
  input: ScheduleBlockInput;
}) {
  const db = getDb();
  const { organizationId, actorUserId, input } = params;

  if (input.professionalId) {
    const [prof] = await db
      .select({ id: professionals.id, organizationId: professionals.organizationId })
      .from(professionals)
      .where(
        and(eq(professionals.id, input.professionalId), isNull(professionals.deletedAt))
      )
      .limit(1);
    assertTenantOwnership(prof?.organizationId, organizationId);
  }

  const startsAt = buildBrazilTimestamp(input.startDate, input.startTime);
  const endsAt = buildBrazilTimestamp(input.endDate, input.endTime);

  if (endsAt.getTime() <= startsAt.getTime()) {
    throw new Error("O término do bloqueio deve ser posterior ao início.");
  }

  const [created] = await db
    .insert(scheduleBlocks)
    .values({
      organizationId,
      professionalId: input.professionalId || null,
      type: input.type,
      title: input.title,
      startsAt,
      endsAt,
      notes: input.notes || null,
    })
    .returning();

  await logAudit({
    organizationId,
    actorUserId,
    action: "schedule_block.created",
    resourceType: "schedule_block",
    resourceId: created?.id ?? null,
    metadata: { type: input.type },
  });

  return created!;
}

export async function deleteScheduleBlock(params: {
  organizationId: string;
  actorUserId: string;
  blockId: string;
}) {
  const db = getDb();
  const { organizationId, actorUserId, blockId } = params;

  const [existing] = await db
    .select({
      id: scheduleBlocks.id,
      organizationId: scheduleBlocks.organizationId,
    })
    .from(scheduleBlocks)
    .where(and(eq(scheduleBlocks.id, blockId), isNull(scheduleBlocks.deletedAt)))
    .limit(1);

  assertTenantOwnership(existing?.organizationId, organizationId);

  await db
    .update(scheduleBlocks)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(scheduleBlocks.id, blockId),
        eq(scheduleBlocks.organizationId, organizationId)
      )
    );

  await logAudit({
    organizationId,
    actorUserId,
    action: "schedule_block.deleted",
    resourceType: "schedule_block",
    resourceId: blockId,
  });
}

