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
      clientPhone: clients.whatsapp,
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
    ...row,
    startsAtIso: row.startsAt.toISOString(),
    endsAtIso: row.endsAt.toISOString(),
    services: byAppt.get(row.id) ?? [],
  }));
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

  const startsAt = buildBrazilTimestamp(input.date, input.startTime);
  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);

  // Query potential conflicts on the same day window for this professional
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
    } else {
      throw new Error(conflict.message || "Conflito de horário detectado.");
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
        notes: input.notes || null,
        createdByUserId: actorUserId,
      })
      .returning();

    savedId = inserted!.id;
  }

  await db.insert(appointmentServices).values(
    serviceRows.map((svc, idx) => ({
      organizationId,
      appointmentId: savedId!,
      serviceId: svc.id,
      serviceNameSnapshot: svc.name,
      priceCents: svc.priceCents,
      durationMinutes: svc.durationMinutes,
      sortOrder: idx,
    }))
  );

  await logAudit({
    organizationId,
    actorUserId,
    action: appointmentId ? "appointment.updated" : "appointment.created",
    resourceType: "appointment",
    resourceId: savedId!,
    metadata: {
      status: input.status,
      isOverbooking: conflict.hasConflict && input.allowOverbooking,
      serviceCount: serviceRows.length,
    },
  });

  return { id: savedId! };
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

