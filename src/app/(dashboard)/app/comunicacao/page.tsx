import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/tenant/context";
import { hasPermission } from "@/lib/permissions/evaluator";
import { listAppointmentsInRange } from "@/modules/agenda/service";
import {
  listCommunicationLogs,
  listMessageTemplates,
} from "@/modules/communications/service";
import { listClients } from "@/modules/clients/service";
import { CommunicationsHub } from "@/components/communications/communications-hub";

export default async function CommunicationsPage() {
  let ctx;
  try {
    ctx = await requirePermission("communications:read");
  } catch {
    redirect("/app");
  }

  const now = new Date();
  const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60_000);

  const [upcomingAppts, templates, logs, allClients] = await Promise.all([
    listAppointmentsInRange({
      organizationId: ctx.organizationId,
      rangeStart: now,
      rangeEnd: next7Days,
    }),
    listMessageTemplates(ctx.organizationId),
    listCommunicationLogs(ctx.organizationId),
    listClients(ctx.organizationId),
  ]);

  const emailByClient = new Map(allClients.map((c) => [c.id, c.email]));

  const reminders = upcomingAppts
    .filter((a) => a.status === "waiting" || a.status === "confirmed")
    .map((a) => {
      const d = new Date(a.startsAtIso);
      const dateLabel = new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(d);
      const timeLabel = new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo",
        hour: "2-digit",
        minute: "2-digit",
      }).format(d);

      return {
        appointmentId: a.id,
        clientId: a.clientId,
        clientName: a.clientName,
        clientPhone: a.clientPhone,
        clientEmail: emailByClient.get(a.clientId) ?? null,
        professionalName: a.professionalName,
        serviceNames: a.services.map((s) => s.serviceName).join(", ") || "Atendimento",
        dateLabel,
        timeLabel,
        status: a.status,
      };
    });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#142B4F]">Comunicação</h1>
        <p className="text-sm text-[#64748B]">
          Lembretes de agenda via WhatsApp (links oficiais wa.me), templates personalizáveis e histórico de envios.
        </p>
      </div>

      <CommunicationsHub
        organizationName={ctx.organizationName}
        upcomingReminders={reminders}
        templates={templates}
        logs={logs.map((l) => ({
          id: l.id,
          channel: l.channel,
          category: l.category,
          recipient: l.recipient,
          subject: l.subject,
          renderedBody: l.renderedBody,
          status: l.status,
          createdAtIso: l.createdAt.toISOString(),
        }))}
        canManage={hasPermission(ctx.permissions, "communications:manage")}
      />
    </div>
  );
}

