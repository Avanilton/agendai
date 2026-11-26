"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Cake,
  Calendar,
  CheckCircle2,
  ExternalLink,
  FileHeart,
  Loader2,
  MessageCircle,
  PartyPopper,
  Pencil,
  Play,
  UserPlus,
  UserPen,
  Wallet,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import type { AgendaAppointmentRow } from "@/components/agenda/agenda-manager";
import type { AppointmentStatus } from "@/modules/agenda/conflicts";
import type { ClientFullProfile } from "@/modules/clients/profile-service";
import { getClientProfileAction } from "@/modules/clients/actions";
import { updateAppointmentAction } from "@/modules/agenda/actions";
import { buildWhatsAppUrl } from "@/modules/communications/templates";
import { formatCurrencyBRL, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { BirthdayFireworks } from "@/components/agenda/birthday-fireworks";
import { ClientQuickFormModal } from "@/components/cadastros/client-quick-form-modal";

type ModalTab = "resumo" | "historico" | "anamnese" | "financeiro";

const STATUS_META: Record<
  AppointmentStatus,
  { label: string; className: string }
> = {
  waiting: { label: "Aguardando", className: "bg-[#FFF0E5] text-[#C2410C]" },
  confirmed: { label: "Confirmado", className: "bg-emerald-50 text-emerald-700" },
  in_progress: { label: "Em atendimento", className: "bg-[#EAF2FF] text-[#2563EB]" },
  completed: { label: "Concluído", className: "bg-slate-200 text-[#142B4F]" },
  cancelled: { label: "Cancelado", className: "bg-red-50 text-red-700" },
  no_show: { label: "Não compareceu", className: "bg-rose-100 text-rose-800" },
};

const TX_STATUS_LABELS: Record<string, { label: string; className: string }> = {
  paid: { label: "Pago", className: "bg-emerald-50 text-emerald-700" },
  pending: { label: "Pendente", className: "bg-[#FFF0E5] text-[#C2410C]" },
  partial: { label: "Parcial", className: "bg-amber-50 text-amber-700" },
  cancelled: { label: "Cancelado", className: "bg-red-50 text-red-700" },
};

function toLocalDateKey(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")?.value ?? "2026";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${y}-${m}-${day}`;
}

function toLocalTime(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatDateTimeBR(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatDateBR(dateStr: string | null): string {
  if (!dateStr) return "—";
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr.split("-").reverse().join("/");
  }
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(dateStr));
}

function checkClientBirthday(
  birthDate: string | null | undefined,
  appointmentStartsAtIso: string
): { isBirthday: boolean; isToday: boolean } {
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    return { isBirthday: false, isToday: false };
  }
  const bdayMd = birthDate.slice(5, 10);
  const todayMd = toLocalDateKey(new Date()).slice(5, 10);
  const apptMd = toLocalDateKey(appointmentStartsAtIso).slice(5, 10);

  if (bdayMd === todayMd) {
    return { isBirthday: true, isToday: true };
  }
  if (bdayMd === apptMd) {
    return { isBirthday: true, isToday: false };
  }
  return { isBirthday: false, isToday: false };
}

interface AppointmentDetailModalProps {
  appointment: AgendaAppointmentRow | null;
  organizationName: string;
  canWrite: boolean;
  canDelete: boolean;
  canWriteClients: boolean;
  onClose: () => void;
  onEditAppointment: (appt: AgendaAppointmentRow) => void;
  onQuickStatus: (appt: AgendaAppointmentRow, status: AppointmentStatus) => void;
}

export function AppointmentDetailModal(props: AppointmentDetailModalProps) {
  if (!props.appointment) return null;
  return (
    <AppointmentDetailModalInner
      key={props.appointment.id}
      {...props}
      appointment={props.appointment}
    />
  );
}

interface AppointmentDetailModalInnerProps
  extends Omit<AppointmentDetailModalProps, "appointment"> {
  appointment: AgendaAppointmentRow;
}

function AppointmentDetailModalInner({
  appointment,
  organizationName,
  canWrite,
  canDelete,
  canWriteClients,
  onClose,
  onEditAppointment,
  onQuickStatus,
}: AppointmentDetailModalInnerProps) {
  const router = useRouter();
  const initialBirthday = checkClientBirthday(
    appointment.clientBirthDate,
    appointment.startsAtIso
  );

  const [activeTab, setActiveTab] = useState<ModalTab>("resumo");
  const [profile, setProfile] = useState<ClientFullProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [birthdayDismissed, setBirthdayDismissed] = useState(false);
  const [fireworksActive, setFireworksActive] = useState(
    initialBirthday.isBirthday
  );

  const [clientModalMode, setClientModalMode] = useState<"edit" | "create" | null>(
    null
  );

  const birthdayInfo = checkClientBirthday(
    profile?.client.birthDate ?? appointment.clientBirthDate,
    appointment.startsAtIso
  );

  useEffect(() => {
    let cancelled = false;
    getClientProfileAction(appointment.clientId).then((res) => {
      if (cancelled) return;
      setLoadingProfile(false);
      if (res.success && res.data) {
        setProfile(res.data);
        if (!initialBirthday.isBirthday) {
          const updatedBday = checkClientBirthday(
            res.data.client.birthDate,
            appointment.startsAtIso
          );
          if (updatedBday.isBirthday) {
            setFireworksActive(true);
          }
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [appointment.clientId, appointment.startsAtIso, initialBirthday.isBirthday]);

  const statusMeta = STATUS_META[appointment.status];
  const clientPhone =
    profile?.client.whatsapp ||
    profile?.client.phone ||
    appointment.clientPhone;

  const reminderWhatsUrl = buildWhatsAppUrl(
    clientPhone,
    `Olá, ${appointment.clientName}! Lembrando do seu agendamento em ${organizationName} no dia ${formatDateBR(
      toLocalDateKey(appointment.startsAtIso)
    )} às ${toLocalTime(appointment.startsAtIso)} com ${
      appointment.professionalName
    }.`
  );

  const birthdayWhatsUrl = buildWhatsAppUrl(
    clientPhone,
    `Parabéns pelo seu dia, ${appointment.clientName}! 🎉🎂 A equipe ${organizationName} deseja muita saúde, alegria e sucesso neste novo ciclo!`
  );

  async function handleClientCreatedFromAppointment(saved: {
    id: string;
    name: string;
  }) {
    if (!appointment || !saved.id || !canWrite) {
      router.refresh();
      return;
    }

    // Link the appointment to the newly created client automatically
    const res = await updateAppointmentAction(appointment.id, {
      clientId: saved.id,
      professionalId: appointment.professionalId,
      serviceIds: appointment.services.map((s) => s.serviceId),
      date: toLocalDateKey(appointment.startsAtIso),
      startTime: toLocalTime(appointment.startsAtIso),
      durationMinutes: appointment.durationMinutes,
      totalPriceReais: appointment.totalPriceCents / 100,
      status: appointment.status,
      allowOverbooking: appointment.isOverbooking,
      notes: appointment.notes ?? "",
    });

    if (res.success) {
      toast.success(`Agendamento vinculado ao novo cliente ${saved.name}!`);
    }
    router.refresh();
  }

  return (
    <>
      <BirthdayFireworks
        active={fireworksActive}
        onComplete={() => setFireworksActive(false)}
      />

      <Modal
        open={Boolean(appointment)}
        onClose={onClose}
        title={appointment.clientName}
        description={`${formatDateTimeBR(appointment.startsAtIso)} • ${appointment.professionalName} • ${formatCurrencyBRL(appointment.totalPriceCents)}`}
        className="max-w-3xl"
      >
        <div className="space-y-4">
          {/* BIRTHDAY CELEBRATION BANNER */}
          {birthdayInfo.isBirthday && !birthdayDismissed && (
            <div className="relative overflow-hidden rounded-2xl border-2 border-[#FF914D] bg-gradient-to-r from-[#FFF0E5] via-amber-50 to-pink-50 p-4 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FF914D] text-white shadow-xs">
                    <PartyPopper className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-[#142B4F]">
                      🎉{" "}
                      {birthdayInfo.isToday
                        ? `Hoje é aniversário de ${appointment.clientName}!`
                        : `Aniversário de ${appointment.clientName} no dia deste atendimento!`}
                    </p>
                    <p className="mt-0.5 text-xs text-[#64748B]">
                      Deseja enviar uma mensagem especial de feliz aniversário pelo WhatsApp?
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {birthdayWhatsUrl ? (
                    <Button size="sm" variant="accent" asChild>
                      <a
                        href={birthdayWhatsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Cake className="h-3.5 w-3.5" />
                        Enviar msg de aniversário
                      </a>
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="accent"
                      onClick={() =>
                        toast.error(
                          "Cadastre um número de WhatsApp/telefone para enviar a mensagem."
                        )
                      }
                    >
                      <Cake className="h-3.5 w-3.5" />
                      Enviar msg de aniversário
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setBirthdayDismissed(true)}
                  >
                    Recusar
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* QUICK ACTIONS BAR */}
          <div className="rounded-xl border border-slate-200 bg-[#F5F7FA] p-3 space-y-2.5">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#64748B]">
              Ações rápidas
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {reminderWhatsUrl ? (
                <Button size="sm" variant="outline" asChild>
                  <a
                    href={reminderWhatsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                    Enviar WhatsApp
                  </a>
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    toast.error("Cliente sem WhatsApp/telefone cadastrado.")
                  }
                >
                  <MessageCircle className="h-3.5 w-3.5 text-slate-400" />
                  Enviar WhatsApp
                </Button>
              )}

              {canWriteClients && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setClientModalMode("edit")}
                  >
                    <UserPen className="h-3.5 w-3.5 text-[#2563EB]" />
                    Editar cliente
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setClientModalMode("create")}
                    title="Criar um novo cadastro de cliente pré-preenchido com as informações deste agendamento"
                  >
                    <UserPlus className="h-3.5 w-3.5 text-[#FF914D]" />
                    Cadastrar cliente do agendamento
                  </Button>
                </>
              )}

              <Button size="sm" variant="secondary" asChild>
                <Link href={`/app/clientes/${appointment.clientId}`}>
                  <ExternalLink className="h-3.5 w-3.5" />
                  Tela completa do cliente
                </Link>
              </Button>

              {canWrite && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onClose();
                    onEditAppointment(appointment);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Editar agendamento
                </Button>
              )}
            </div>

            {/* Status transitions */}
            {canWrite && (
              <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-200/80 pt-2">
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                    statusMeta.className
                  )}
                >
                  Status: {statusMeta.label}
                </span>
                {appointment.status === "waiting" && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      onQuickStatus(appointment, "confirmed");
                      onClose();
                    }}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Confirmar
                  </Button>
                )}
                {(appointment.status === "waiting" ||
                  appointment.status === "confirmed") && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onQuickStatus(appointment, "in_progress");
                      onClose();
                    }}
                  >
                    <Play className="h-3.5 w-3.5" />
                    Iniciar
                  </Button>
                )}
                {appointment.status === "in_progress" && (
                  <Button
                    size="sm"
                    onClick={() => {
                      onQuickStatus(appointment, "completed");
                      onClose();
                    }}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Concluir
                  </Button>
                )}
                {canDelete &&
                  appointment.status !== "cancelled" &&
                  appointment.status !== "completed" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        onQuickStatus(appointment, "cancelled");
                        onClose();
                      }}
                    >
                      <XCircle className="h-3.5 w-3.5 text-red-600" />
                      Cancelar
                    </Button>
                  )}
              </div>
            )}
          </div>

          {/* TABS */}
          <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1">
            {(
              [
                { id: "resumo", label: "Agendamento", icon: Calendar },
                {
                  id: "historico",
                  label: "Histórico",
                  icon: Calendar,
                  count: profile?.appointments.length,
                },
                {
                  id: "anamnese",
                  label: "Anamnese",
                  icon: FileHeart,
                  count: profile?.records.length,
                },
                {
                  id: "financeiro",
                  label: "Financeiro",
                  icon: Wallet,
                  count: profile
                    ? profile.transactions.length + profile.sales.length
                    : undefined,
                },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer",
                    active
                      ? "bg-[#2563EB] text-white"
                      : "text-[#64748B] hover:bg-slate-100 hover:text-[#142B4F]"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                  {"count" in tab && tab.count !== undefined && (
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
                        active
                          ? "bg-white/20 text-white"
                          : "bg-slate-100 text-[#142B4F]"
                      )}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* TAB CONTENT */}
          {activeTab === "resumo" && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase text-[#64748B]">
                    Serviços
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-[#142B4F]">
                    {appointment.services.map((s) => s.serviceName).join(", ") ||
                      "Serviço"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase text-[#64748B]">
                    Profissional
                  </p>
                  <p className="mt-0.5 flex items-center gap-2 text-sm font-bold text-[#142B4F]">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: appointment.professionalColor }}
                    />
                    {appointment.professionalName}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase text-[#64748B]">
                    Horário e Duração
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-[#142B4F]">
                    {formatDateBR(toLocalDateKey(appointment.startsAtIso))} •{" "}
                    {toLocalTime(appointment.startsAtIso)} –{" "}
                    {toLocalTime(appointment.endsAtIso)} ({appointment.durationMinutes}{" "}
                    min)
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase text-[#64748B]">
                    Valor total
                  </p>
                  <p className="mt-0.5 text-sm font-extrabold text-[#2563EB]">
                    {formatCurrencyBRL(appointment.totalPriceCents)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase text-[#64748B]">
                    Contato do cliente
                  </p>
                  <p className="mt-0.5 text-xs text-[#142B4F]">
                    {clientPhone || "Sem telefone"}
                    {appointment.clientEmail ? ` • ${appointment.clientEmail}` : ""}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase text-[#64748B]">
                    Nascimento
                  </p>
                  <p className="mt-0.5 text-xs text-[#142B4F]">
                    {formatDateBR(
                      profile?.client.birthDate ??
                        appointment.clientBirthDate ??
                        null
                    )}
                  </p>
                </div>
              </div>

              {appointment.notes && (
                <div className="rounded-xl bg-[#F5F7FA] p-3 text-xs text-[#142B4F]">
                  <p className="font-bold">Observações do agendamento</p>
                  <p className="mt-1 whitespace-pre-wrap text-[#64748B]">
                    {appointment.notes}
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab !== "resumo" && loadingProfile && (
            <div className="flex items-center justify-center gap-2 py-10 text-xs text-[#64748B]">
              <Loader2 className="h-4 w-4 animate-spin text-[#2563EB]" />
              Carregando informações do cliente...
            </div>
          )}

          {/* TAB: HISTÓRICO DE AGENDAMENTOS */}
          {activeTab === "historico" && !loadingProfile && profile && (
            <div className="space-y-3">
              {!profile.permissions.canReadAppointments ? (
                <p className="text-xs text-[#64748B]">
                  Sem permissão para visualizar o histórico de agendamentos.
                </p>
              ) : profile.appointments.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-xs text-[#64748B]">
                  Nenhum agendamento encontrado para este cliente.
                </p>
              ) : (
                <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                  {profile.appointments.slice(0, 10).map((item) => {
                    const meta = STATUS_META[item.status];
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 text-xs"
                      >
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-bold text-[#142B4F]">
                              {formatDateTimeBR(item.startsAtIso)}
                            </span>
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                meta.className
                              )}
                            >
                              {meta.label}
                            </span>
                          </div>
                          <p className="truncate text-[#64748B]">
                            {item.professionalName} •{" "}
                            {item.services.map((s) => s.serviceName).join(", ") ||
                              "Serviço"}
                          </p>
                        </div>
                        <span className="shrink-0 font-bold text-[#2563EB]">
                          {formatCurrencyBRL(item.totalPriceCents)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex justify-end pt-1">
                <Button size="sm" variant="outline" asChild>
                  <Link
                    href={`/app/clientes/${appointment.clientId}?tab=agendamentos`}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Ver histórico detalhado na tela do cliente
                  </Link>
                </Button>
              </div>
            </div>
          )}

          {/* TAB: FICHAS DE ANAMNESE */}
          {activeTab === "anamnese" && !loadingProfile && profile && (
            <div className="space-y-3">
              {!profile.permissions.canReadRecords ? (
                <p className="text-xs text-[#64748B]">
                  Sem permissão para visualizar fichas de anamnese.
                </p>
              ) : profile.records.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-xs text-[#64748B]">
                  Nenhuma ficha de anamnese registrada para este cliente.
                </p>
              ) : (
                <div className="max-h-72 space-y-2.5 overflow-y-auto pr-1">
                  {profile.records.slice(0, 8).map((rec) => {
                    const previewEntries = Object.entries(rec.answers).slice(0, 3);
                    return (
                      <div
                        key={rec.id}
                        className="rounded-xl border border-slate-200 p-3 text-xs space-y-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#142B4F]">
                              {rec.templateNameSnapshot}
                            </span>
                            <Badge variant="outline" className="text-[10px]">
                              v{rec.version}
                            </Badge>
                          </div>
                          <span className="text-[11px] text-[#64748B]">
                            {formatDateTimeBR(rec.createdAtIso)}
                          </span>
                        </div>
                        {previewEntries.length > 0 && (
                          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                            {previewEntries.map(([k, v]) => (
                              <div
                                key={k}
                                className="rounded-lg bg-[#F5F7FA] px-2.5 py-1.5"
                              >
                                <p className="truncate font-semibold text-[#142B4F]">
                                  {rec.fieldLabels[k] || k}
                                </p>
                                <p className="truncate text-[#64748B]">
                                  {typeof v === "boolean"
                                    ? v
                                      ? "Sim"
                                      : "Não"
                                    : String(v || "—")}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex justify-end pt-1">
                <Button size="sm" variant="outline" asChild>
                  <Link
                    href={`/app/clientes/${appointment.clientId}?tab=anamnese`}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Ver fichas detalhadas na tela do cliente
                  </Link>
                </Button>
              </div>
            </div>
          )}

          {/* TAB: HISTÓRICO FINANCEIRO */}
          {activeTab === "financeiro" && !loadingProfile && profile && (
            <div className="space-y-3">
              {!profile.permissions.canReadFinancial ? (
                <p className="text-xs text-[#64748B]">
                  Sem permissão para visualizar o histórico financeiro.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-xl bg-emerald-50/80 p-3">
                      <p className="text-[10px] font-semibold uppercase text-emerald-700">
                        Total pago
                      </p>
                      <p className="mt-0.5 text-sm font-extrabold text-emerald-800">
                        {formatCurrencyBRL(profile.summary.totalPaidCents)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-[#FFF0E5]/80 p-3">
                      <p className="text-[10px] font-semibold uppercase text-[#C2410C]">
                        Pendente
                      </p>
                      <p className="mt-0.5 text-sm font-extrabold text-[#C2410C]">
                        {formatCurrencyBRL(profile.summary.totalPendingCents)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-[#EAF2FF]/80 p-3">
                      <p className="text-[10px] font-semibold uppercase text-[#2563EB]">
                        Em vendas
                      </p>
                      <p className="mt-0.5 text-sm font-extrabold text-[#142B4F]">
                        {formatCurrencyBRL(profile.summary.totalSalesCents)}
                      </p>
                    </div>
                  </div>

                  {profile.transactions.length === 0 &&
                  profile.sales.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-xs text-[#64748B]">
                      Nenhuma movimentação financeira registrada para este cliente.
                    </p>
                  ) : (
                    <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
                      {profile.transactions.slice(0, 8).map((tx) => {
                        const meta = TX_STATUS_LABELS[tx.status] ?? {
                          label: tx.status,
                          className: "bg-slate-100 text-slate-700",
                        };
                        return (
                          <div
                            key={tx.id}
                            className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 p-3 text-xs"
                          >
                            <div className="min-w-0">
                              <p className="truncate font-bold text-[#142B4F]">
                                {tx.description}
                              </p>
                              <p className="text-[11px] text-[#64748B]">
                                Venc.: {formatDateBR(tx.dueDate)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className={cn(
                                  "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                  meta.className
                                )}
                              >
                                {meta.label}
                              </span>
                              <span className="font-bold text-[#142B4F]">
                                {formatCurrencyBRL(tx.amountCents)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                      {profile.sales.slice(0, 5).map((sale) => (
                        <div
                          key={sale.id}
                          className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 p-3 text-xs"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-bold text-[#142B4F]">
                              Venda ({sale.items.map((i) => i.nameSnapshot).join(", ") || "Itens"})
                            </p>
                            <p className="text-[11px] text-[#64748B]">
                              {formatDateTimeBR(sale.createdAtIso)}
                            </p>
                          </div>
                          <span className="shrink-0 font-bold text-[#2563EB]">
                            {formatCurrencyBRL(sale.totalCents)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              <div className="flex justify-end pt-1">
                <Button size="sm" variant="outline" asChild>
                  <Link
                    href={`/app/clientes/${appointment.clientId}?tab=financeiro`}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Ver financeiro detalhado na tela do cliente
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Inline Client Edit / Create from Appointment Modal */}
      {canWriteClients && clientModalMode === "edit" && (
        <ClientQuickFormModal
          open
          onClose={() => setClientModalMode(null)}
          mode="edit"
          title="Editar cadastro do cliente"
          initialValues={
            profile
              ? {
                  id: profile.client.id,
                  name: profile.client.name,
                  cpf: profile.client.cpf,
                  phone: profile.client.phone,
                  whatsapp: profile.client.whatsapp,
                  email: profile.client.email,
                  birthDate: profile.client.birthDate,
                  address: profile.client.address,
                  notes: profile.client.notes,
                  tags: profile.client.tags,
                  origin: profile.client.origin,
                  status: profile.client.status,
                  whatsappOptIn:
                    profile.client.contactPreferences.whatsapp ?? true,
                  emailOptIn: profile.client.contactPreferences.email ?? true,
                  lgpdConsent: Boolean(profile.client.lgpdConsentAtIso),
                }
              : {
                  id: appointment.clientId,
                  name: appointment.clientName,
                  phone: appointment.clientPhone,
                  whatsapp: appointment.clientPhone,
                  email: appointment.clientEmail,
                  birthDate: appointment.clientBirthDate,
                }
          }
          onSaved={() => {
            router.refresh();
            getClientProfileAction(appointment.clientId).then((res) => {
              if (res.success && res.data) setProfile(res.data);
            });
          }}
        />
      )}

      {canWriteClients && clientModalMode === "create" && (
        <ClientQuickFormModal
          open
          onClose={() => setClientModalMode(null)}
          mode="create"
          title="Cadastrar cliente a partir do agendamento"
          description="Pré-preenchido com os dados deste agendamento. Ao salvar, o agendamento será vinculado ao novo cliente."
          initialValues={{
            name: appointment.clientName,
            phone: appointment.clientPhone ?? "",
            whatsapp: appointment.clientPhone ?? "",
            email: "",
            notes: appointment.notes ?? "",
            origin: "Agendamento",
            status: "active",
            whatsappOptIn: true,
            emailOptIn: true,
            lgpdConsent: true,
          }}
          onSaved={handleClientCreatedFromAppointment}
        />
      )}
    </>
  );
}

