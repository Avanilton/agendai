import { and, asc, eq, gte, inArray, isNull, lte, or } from "drizzle-orm";
import { getDb } from "@/db";
import {
  appointments,
  appointmentServices,
  availabilityRules,
  bookingSettings,
  clients,
  organizations,
  professionals,
  professionalServices,
  scheduleBlocks,
  services,
} from "@/db/schema";
import { logAudit } from "@/lib/security/audit";
import { buildBrazilTimestamp } from "@/modules/agenda/service";
import {
  generateAvailableSlots,
  mergeMultiProfessionalSlots,
  type DayAvailabilityRule,
} from "./slots";
import type { BookingSettingsInput, PublicBookingSubmitInput } from "./schemas";

export const DEFAULT_BOOKING_SETTINGS = {
  isEnabled: true,
  allowAnyProfessional: true,
  minAdvanceMinutes: 60,
  maxAdvanceDays: 30,
  slotIntervalMinutes: 30,
  autoConfirm: false,
  cancellationPolicyHours: 24,
  welcomeMessage: null as string | null,
};

export async function getBookingSettings(organizationId: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(bookingSettings)
    .where(eq(bookingSettings.organizationId, organizationId))
    .limit(1);

  if (!row) {
    return { organizationId, ...DEFAULT_BOOKING_SETTINGS };
  }
  return row;
}

export async function saveBookingSettings(params: {
  organizationId: string;
  actorUserId: string;
  input: BookingSettingsInput;
}) {
  const db = getDb();
  const { organizationId, actorUserId, input } = params;

  await db
    .insert(bookingSettings)
    .values({
      organizationId,
      isEnabled: input.isEnabled,
      allowAnyProfessional: input.allowAnyProfessional,
      minAdvanceMinutes: input.minAdvanceMinutes,
      maxAdvanceDays: input.maxAdvanceDays,
      slotIntervalMinutes: input.slotIntervalMinutes,
      autoConfirm: input.autoConfirm,
      cancellationPolicyHours: input.cancellationPolicyHours,
      welcomeMessage: input.welcomeMessage || null,
    })
    .onConflictDoUpdate({
      target: bookingSettings.organizationId,
      set: {
        isEnabled: input.isEnabled,
        allowAnyProfessional: input.allowAnyProfessional,
        minAdvanceMinutes: input.minAdvanceMinutes,
        maxAdvanceDays: input.maxAdvanceDays,
        slotIntervalMinutes: input.slotIntervalMinutes,
        autoConfirm: input.autoConfirm,
        cancellationPolicyHours: input.cancellationPolicyHours,
        welcomeMessage: input.welcomeMessage || null,
        updatedAt: new Date(),
      },
    });

  await logAudit({
    organizationId,
    actorUserId,
    action: "booking_settings.updated",
    resourceType: "booking_settings",
    resourceId: organizationId,
    metadata: { isEnabled: input.isEnabled, autoConfirm: input.autoConfirm },
  });
}

export async function getPublicOrganizationProfile(slug: string) {
  const db = getDb();
  const [org] = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      segment: organizations.segment,
      phone: organizations.phone,
      address: organizations.address,
      timezone: organizations.timezone,
      status: organizations.status,
    })
    .from(organizations)
    .where(and(eq(organizations.slug, slug), isNull(organizations.deletedAt)))
    .limit(1);

  if (!org || org.status === "suspended" || org.status === "cancelled") {
    return null;
  }

  const [settings, activeServices, activeProfessionals, links] =
    await Promise.all([
      getBookingSettings(org.id),
      db
        .select({
          id: services.id,
          name: services.name,
          category: services.category,
          description: services.description,
          priceCents: services.priceCents,
          durationMinutes: services.durationMinutes,
          bufferMinutes: services.bufferMinutes,
        })
        .from(services)
        .where(
          and(
            eq(services.organizationId, org.id),
            eq(services.status, "active"),
            isNull(services.deletedAt)
          )
        )
        .orderBy(asc(services.name)),
      db
        .select({
          id: professionals.id,
          name: professionals.name,
          specialty: professionals.specialty,
          color: professionals.color,
        })
        .from(professionals)
        .where(
          and(
            eq(professionals.organizationId, org.id),
            eq(professionals.status, "active"),
            isNull(professionals.deletedAt)
          )
        )
        .orderBy(asc(professionals.name)),
      db
        .select({
          serviceId: professionalServices.serviceId,
          professionalId: professionalServices.professionalId,
        })
        .from(professionalServices)
        .where(eq(professionalServices.organizationId, org.id)),
    ]);

  const profsByService = new Map<string, string[]>();
  for (const l of links) {
    const arr = profsByService.get(l.serviceId) ?? [];
    arr.push(l.professionalId);
    profsByService.set(l.serviceId, arr);
  }

  return {
    organization: org,
    settings,
    services: activeServices.map((s) => ({
      ...s,
      professionalIds: profsByService.get(s.id) ?? [],
    })),
    professionals: activeProfessionals,
  };
}

function getDefaultDayRule(dayOfWeek: number): DayAvailabilityRule {
  return {
    isActive: dayOfWeek >= 1 && dayOfWeek <= 5,
    startTime: "08:00",
    endTime: "18:00",
    breakStartTime: "12:00",
    breakEndTime: "13:00",
  };
}

export async function getPublicAvailableSlots(params: {
  slug: string;
  serviceId: string;
  dateStr: string;
  professionalId?: string;
}) {
  const db = getDb();
  const profile = await getPublicOrganizationProfile(params.slug);
  if (!profile || !profile.settings.isEnabled) {
    return { error: "Agendamento online indisponível para esta empresa.", slots: [] as string[] };
  }

  const orgId = profile.organization.id;
  const svc = profile.services.find((s) => s.id === params.serviceId);
  if (!svc) {
    return { error: "Serviço não encontrado.", slots: [] as string[] };
  }

  // Eligible professionals: linked ones, or all active professionals if none explicitly linked
  const linkedProfIds = svc.professionalIds;
  const eligibleProfs =
    linkedProfIds.length > 0
      ? profile.professionals.filter((p) => linkedProfIds.includes(p.id))
      : profile.professionals;

  if (eligibleProfs.length === 0) {
    return { error: "Nenhum profissional disponível para este serviço.", slots: [] as string[] };
  }

  let targetProfs = eligibleProfs;
  if (params.professionalId && params.professionalId !== "any") {
    const specific = eligibleProfs.find((p) => p.id === params.professionalId);
    if (!specific) {
      return { error: "Profissional não disponível para este serviço.", slots: [] as string[] };
    }
    targetProfs = [specific];
  } else if (!profile.settings.allowAnyProfessional) {
    return { error: "Selecione um profissional específico.", slots: [] as string[] };
  }

  const targetDateMidday = new Date(`${params.dateStr}T12:00:00-03:00`);
  const dayOfWeek = targetDateMidday.getDay();
  const dayStart = new Date(`${params.dateStr}T00:00:00-03:00`);
  const dayEnd = new Date(`${params.dateStr}T23:59:59-03:00`);
  const targetProfIds = targetProfs.map((p) => p.id);

  const [rulesRows, apptsRows, blocksRows] = await Promise.all([
    db
      .select()
      .from(availabilityRules)
      .where(
        and(
          eq(availabilityRules.organizationId, orgId),
          eq(availabilityRules.dayOfWeek, dayOfWeek)
        )
      ),
    db
      .select({
        id: appointments.id,
        professionalId: appointments.professionalId,
        startsAt: appointments.startsAt,
        endsAt: appointments.endsAt,
        status: appointments.status,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.organizationId, orgId),
          inArray(appointments.professionalId, targetProfIds),
          isNull(appointments.deletedAt),
          gte(appointments.endsAt, dayStart),
          lte(appointments.startsAt, dayEnd)
        )
      ),
    db
      .select({
        id: scheduleBlocks.id,
        professionalId: scheduleBlocks.professionalId,
        startsAt: scheduleBlocks.startsAt,
        endsAt: scheduleBlocks.endsAt,
        title: scheduleBlocks.title,
      })
      .from(scheduleBlocks)
      .where(
        and(
          eq(scheduleBlocks.organizationId, orgId),
          isNull(scheduleBlocks.deletedAt),
          or(
            inArray(scheduleBlocks.professionalId, targetProfIds),
            isNull(scheduleBlocks.professionalId)
          )!,
          gte(scheduleBlocks.endsAt, dayStart),
          lte(scheduleBlocks.startsAt, dayEnd)
        )
      ),
  ]);

  const orgDefaultRule =
    rulesRows.find((r) => r.professionalId === null) ?? getDefaultDayRule(dayOfWeek);
  const serviceTotalMinutes = svc.durationMinutes + svc.bufferMinutes;
  const now = new Date();

  const perProfResults = targetProfs.map((prof) => {
    const profRule =
      rulesRows.find((r) => r.professionalId === prof.id) ?? orgDefaultRule;
    const profAppts = apptsRows.filter((a) => a.professionalId === prof.id);
    const profBlocks = blocksRows.filter(
      (b) => b.professionalId === null || b.professionalId === prof.id
    );

    const slots = generateAvailableSlots({
      dateStr: params.dateStr,
      rule: profRule,
      slotIntervalMinutes: profile.settings.slotIntervalMinutes,
      serviceTotalMinutes,
      minAdvanceMinutes: profile.settings.minAdvanceMinutes,
      maxAdvanceDays: profile.settings.maxAdvanceDays,
      now,
      existingAppointments: profAppts,
      scheduleBlocks: profBlocks,
    });

    return { professional: prof, slots };
  });

  const mergedSlots = mergeMultiProfessionalSlots(
    perProfResults.map((r) => r.slots)
  );

  return {
    slots: mergedSlots,
    perProfResults,
    profile,
    service: svc,
  };
}

export async function createPublicBooking(params: {
  slug: string;
  input: PublicBookingSubmitInput;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const db = getDb();
  const { slug, input, ipAddress, userAgent } = params;

  const availability = await getPublicAvailableSlots({
    slug,
    serviceId: input.serviceId,
    dateStr: input.date,
    professionalId: input.professionalId,
  });

  if ("error" in availability && availability.error) {
    throw new Error(availability.error);
  }

  const { perProfResults, profile, service } = availability;
  if (!perProfResults || !profile || !service) {
    throw new Error("Não foi possível verificar disponibilidade.");
  }

  const matchingProf = perProfResults.find((r) =>
    r.slots.includes(input.time)
  )?.professional;

  if (!matchingProf) {
    throw new Error(
      "Este horário não está mais disponível. Por favor, selecione outro horário."
    );
  }

  const orgId = profile.organization.id;
  const normalizedPhone = input.clientPhone.trim();
  const normalizedEmail = input.clientEmail
    ? input.clientEmail.trim().toLowerCase()
    : null;

  // Match existing client in THIS organization only (never cross-tenant)
  const matchConds = [eq(clients.whatsapp, normalizedPhone), eq(clients.phone, normalizedPhone)];
  if (normalizedEmail) {
    matchConds.push(eq(clients.email, normalizedEmail));
  }

  const [existingClient] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(
      and(
        eq(clients.organizationId, orgId),
        isNull(clients.deletedAt),
        or(...matchConds)!
      )
    )
    .limit(1);

  let clientId = existingClient?.id;

  if (!clientId) {
    const [newClient] = await db
      .insert(clients)
      .values({
        organizationId: orgId,
        name: input.clientName,
        phone: normalizedPhone,
        whatsapp: normalizedPhone,
        email: normalizedEmail,
        origin: "Agendamento Online",
        status: "active",
        lgpdConsentAt: new Date(),
      })
      .returning({ id: clients.id });
    clientId = newClient!.id;
  }

  const durationMinutes = service.durationMinutes + service.bufferMinutes;
  const startsAt = buildBrazilTimestamp(input.date, input.time);
  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);
  const status = profile.settings.autoConfirm ? "confirmed" : "waiting";

  const [createdAppt] = await db
    .insert(appointments)
    .values({
      organizationId: orgId,
      clientId,
      professionalId: matchingProf.id,
      startsAt,
      endsAt,
      durationMinutes,
      totalPriceCents: service.priceCents,
      status,
      isOverbooking: false,
      source: "online",
      notes: input.notes || null,
    })
    .returning();

  await db.insert(appointmentServices).values({
    organizationId: orgId,
    appointmentId: createdAppt!.id,
    serviceId: service.id,
    serviceNameSnapshot: service.name,
    priceCents: service.priceCents,
    durationMinutes: service.durationMinutes,
    sortOrder: 0,
  });

  await logAudit({
    organizationId: orgId,
    actorUserId: null,
    action: "appointment.online_created",
    resourceType: "appointment",
    resourceId: createdAppt!.id,
    metadata: {
      source: "online",
      status,
      serviceId: service.id,
      professionalId: matchingProf.id,
    },
    ipAddress,
    userAgent,
  });

  return {
    appointmentId: createdAppt!.id,
    organizationName: profile.organization.name,
    organizationPhone: profile.organization.phone,
    serviceName: service.name,
    professionalName: matchingProf.name,
    date: input.date,
    time: input.time,
    durationMinutes,
    totalPriceCents: service.priceCents,
    status,
  };
}

