import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/tenant/context";
import { hasPermission } from "@/lib/permissions/evaluator";
import {
  listAppointmentsInRange,
  listOpenFutureAppointments,
  listScheduleBlocks,
} from "@/modules/agenda/service";
import { listClients } from "@/modules/clients/service";
import { listProfessionals } from "@/modules/professionals/service";
import { listServices } from "@/modules/services/service";
import { listActiveClientSubscriptionsMap } from "@/modules/subscriptions/service";
import { AgendaManager } from "@/components/agenda/agenda-manager";

export default async function AgendaPage() {
  let ctx;
  try {
    ctx = await requirePermission("appointments:read");
  } catch {
    redirect("/app");
  }

  const now = new Date();
  const rangeStart = new Date(now.getTime() - 60 * 24 * 60 * 60_000);
  const rangeEnd = new Date(now.getTime() + 90 * 24 * 60 * 60_000);

  const [
    appts,
    openFutureAppts,
    blocks,
    clientRows,
    profRows,
    serviceRows,
    clientSubscriptionsMap,
  ] = await Promise.all([
    listAppointmentsInRange({
      organizationId: ctx.organizationId,
      rangeStart,
      rangeEnd,
    }),
    listOpenFutureAppointments(ctx.organizationId),
    listScheduleBlocks(ctx.organizationId),
    listClients(ctx.organizationId, { status: "active" }),
    listProfessionals(ctx.organizationId),
    listServices(ctx.organizationId),
    listActiveClientSubscriptionsMap(ctx.organizationId),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#142B4F]">Agenda</h1>
        <p className="text-sm text-[#64748B]">
          Visualize por dia, semana, mês ou lista com detecção automática de conflitos.
        </p>
      </div>

      <AgendaManager
        initialAppointments={appts}
        openFutureAppointments={openFutureAppts}
        clientSubscriptions={clientSubscriptionsMap}
        organizationName={ctx.organizationName}
        scheduleBlocks={blocks.map((b) => ({
          id: b.id,
          professionalId: b.professionalId,
          professionalName: b.professionalName,
          type: b.type,
          title: b.title,
          startsAtIso: b.startsAt.toISOString(),
          endsAtIso: b.endsAt.toISOString(),
        }))}
        clients={clientRows.map((c) => ({ id: c.id, name: c.name }))}
        professionals={profRows
          .filter((p) => p.status === "active")
          .map((p) => ({ id: p.id, name: p.name, color: p.color }))}
        services={serviceRows
          .filter((s) => s.status === "active")
          .map((s) => ({
            id: s.id,
            name: s.name,
            priceCents: s.priceCents,
            durationMinutes: s.durationMinutes,
            bufferMinutes: s.bufferMinutes,
          }))}
        canWrite={hasPermission(ctx.permissions, "appointments:write")}
        canDelete={hasPermission(ctx.permissions, "appointments:delete")}
        canOverbook={hasPermission(ctx.permissions, "appointments:overbook")}
        canWriteClients={hasPermission(ctx.permissions, "clients:write")}
      />
    </div>
  );
}

