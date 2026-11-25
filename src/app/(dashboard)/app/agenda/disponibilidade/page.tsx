import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/tenant/context";
import { hasPermission } from "@/lib/permissions/evaluator";
import {
  listAvailabilityRules,
  listScheduleBlocks,
} from "@/modules/agenda/service";
import { listProfessionals } from "@/modules/professionals/service";
import { getBookingSettings } from "@/modules/booking/service";
import { AvailabilityManager } from "@/components/agenda/availability-manager";
import { BookingSettingsCard } from "@/components/booking/booking-settings-card";

export default async function AvailabilityPage() {
  let ctx;
  try {
    ctx = await requirePermission("appointments:read");
  } catch {
    redirect("/app");
  }

  const [dbRules, blocks, profs, bookingConfig] = await Promise.all([
    listAvailabilityRules(ctx.organizationId, null),
    listScheduleBlocks(ctx.organizationId),
    listProfessionals(ctx.organizationId),
    getBookingSettings(ctx.organizationId),
  ]);

  const byDay = new Map(dbRules.map((r) => [r.dayOfWeek, r]));
  const fullWeek = Array.from({ length: 7 }, (_, dayOfWeek) => {
    const existing = byDay.get(dayOfWeek);
    return {
      dayOfWeek,
      startTime: existing?.startTime ?? "08:00",
      endTime: existing?.endTime ?? "18:00",
      breakStartTime: existing?.breakStartTime ?? "12:00",
      breakEndTime: existing?.breakEndTime ?? "13:00",
      isActive: existing ? existing.isActive : dayOfWeek >= 1 && dayOfWeek <= 5,
    };
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#142B4F]">
          Horários e Bloqueios
        </h1>
        <p className="text-sm text-[#64748B]">
          Configure a disponibilidade semanal, férias, feriados e bloqueios de agenda.
        </p>
      </div>

      <BookingSettingsCard
        organizationSlug={ctx.organizationSlug}
        initialSettings={bookingConfig}
        canWrite={hasPermission(ctx.permissions, "appointments:write")}
      />

      <AvailabilityManager
        initialRules={fullWeek}
        initialBlocks={blocks.map((b) => ({
          id: b.id,
          professionalName: b.professionalName,
          type: b.type,
          title: b.title,
          startsAtIso: b.startsAt.toISOString(),
          endsAtIso: b.endsAt.toISOString(),
        }))}
        professionals={profs.map((p) => ({ id: p.id, name: p.name }))}
        canWrite={hasPermission(ctx.permissions, "appointments:write")}
      />
    </div>
  );
}

