"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  MessageCircle,
  Pencil,
  Play,
  Plus,
  Settings2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import {
  createAppointmentAction,
  updateAppointmentAction,
  updateAppointmentStatusAction,
} from "@/modules/agenda/actions";
import type { AppointmentStatus } from "@/modules/agenda/conflicts";
import { buildWhatsAppUrl } from "@/modules/communications/templates";
import { formatCurrencyBRL, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { AgendaTimeGrid } from "@/components/agenda/time-grid";
import { AppointmentDetailModal } from "@/components/agenda/appointment-detail-modal";

export interface AgendaAppointmentRow {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone: string | null;
  clientEmail?: string | null;
  clientBirthDate?: string | null;
  professionalId: string;
  professionalName: string;
  professionalColor: string;
  startsAtIso: string;
  endsAtIso: string;
  durationMinutes: number;
  totalPriceCents: number;
  status: AppointmentStatus;
  isOverbooking: boolean;
  notes: string | null;
  services: {
    serviceId: string;
    serviceName: string;
    priceCents: number;
    durationMinutes: number;
  }[];
}

export interface AgendaBlockRow {
  id: string;
  professionalId: string | null;
  professionalName: string | null;
  type: "block" | "vacation" | "holiday" | "break";
  title: string;
  startsAtIso: string;
  endsAtIso: string;
}

interface AgendaManagerProps {
  initialAppointments: AgendaAppointmentRow[];
  openFutureAppointments: AgendaAppointmentRow[];
  organizationName: string;
  scheduleBlocks: AgendaBlockRow[];
  clients: { id: string; name: string }[];
  professionals: { id: string; name: string; color: string }[];
  services: {
    id: string;
    name: string;
    priceCents: number;
    durationMinutes: number;
    bufferMinutes: number;
  }[];
  canWrite: boolean;
  canDelete: boolean;
  canOverbook: boolean;
  canWriteClients: boolean;
}

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

function addDays(dateKey: string, delta: number): string {
  const d = new Date(`${dateKey}T12:00:00-03:00`);
  d.setDate(d.getDate() + delta);
  return toLocalDateKey(d);
}

function formatReadableDate(dateKey: string): string {
  const d = new Date(`${dateKey}T12:00:00-03:00`);
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

function formatMonthYear(dateKey: string): string {
  const d = new Date(`${dateKey}T12:00:00-03:00`);
  const raw = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    month: "long",
    year: "numeric",
  }).format(d);
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function getDayCardParts(dateKey: string): {
  weekday: string;
  day: string;
  month: string;
} {
  const d = new Date(`${dateKey}T12:00:00-03:00`);
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).formatToParts(d);
  return {
    weekday: (parts.find((p) => p.type === "weekday")?.value ?? "")
      .replace(".", "")
      .toUpperCase(),
    day: parts.find((p) => p.type === "day")?.value ?? "",
    month: (parts.find((p) => p.type === "month")?.value ?? "").replace(".", ""),
  };
}

function getMonthCalendarCells(dateKey: string): {
  dateKey: string;
  inCurrentMonth: boolean;
}[] {
  const [y, m] = dateKey.split("-").map(Number);
  const firstOfMonth = new Date(Date.UTC(y!, m! - 1, 1, 15, 0, 0));
  const startDow = firstOfMonth.getUTCDay(); // 0 = Dom
  const firstKey = `${y}-${String(m).padStart(2, "0")}-01`;
  const gridStart = addDays(firstKey, -startDow);
  const currentMonthPrefix = `${y}-${String(m).padStart(2, "0")}-`;

  return Array.from({ length: 42 }, (_, i) => {
    const dk = addDays(gridStart, i);
    return {
      dateKey: dk,
      inCurrentMonth: dk.startsWith(currentMonthPrefix),
    };
  });
}

function formatWeekRange(dates: string[]): string {
  if (dates.length === 0) return "";
  const first = new Date(`${dates[0]}T12:00:00-03:00`);
  const last = new Date(`${dates[dates.length - 1]}T12:00:00-03:00`);
  const startLabel = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "short",
  }).format(first);
  const endLabel = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(last);
  return `${startLabel} – ${endLabel}`;
}

export function AgendaManager({
  initialAppointments,
  openFutureAppointments,
  organizationName,
  scheduleBlocks,
  clients,
  professionals,
  services,
  canWrite,
  canDelete,
  canOverbook,
  canWriteClients,
}: AgendaManagerProps) {
  const router = useRouter();
  const [view, setView] = useState<"day" | "week" | "month" | "list">("day");
  const [selectedDate, setSelectedDate] = useState(() => toLocalDateKey(new Date()));
  const [professionalFilter, setProfessionalFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [bottomTab, setBottomTab] = useState<"future" | "selected_week">("future");

  const [detailAppt, setDetailAppt] = useState<AgendaAppointmentRow | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const weekContainerRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    moved: boolean;
  }>({ active: false, startX: 0, startY: 0, moved: false });
  const suppressClickRef = useRef(false);
  const lastWheelAtRef = useRef(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (view === "list") return;
    const el = weekContainerRef.current;
    if (!el) return;

    function handleWheel(e: WheelEvent) {
      const primaryDelta =
        Math.abs(e.deltaX) >= Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (Math.abs(primaryDelta) < 18) return;

      e.preventDefault();
      const now = Date.now();
      if (now - lastWheelAtRef.current < 320) return;
      lastWheelAtRef.current = now;

      setSelectedDate((d) => addDays(d, primaryDelta > 0 ? 7 : -7));
    }

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", handleWheel);
    };
  }, [view]);

  function handleWeekPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    dragStateRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
    };
  }

  function handleWeekPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const state = dragStateRef.current;
    if (!state.active) return;

    const dx = e.clientX - state.startX;
    const dy = e.clientY - state.startY;

    if (!state.moved) {
      if (Math.abs(dx) < 8) return;
      if (Math.abs(dy) > Math.abs(dx)) {
        state.active = false;
        return;
      }
      state.moved = true;
      setIsDragging(true);
    }

    const clamped = Math.max(-140, Math.min(140, dx));
    setDragOffset(clamped);
  }

  function finishWeekDrag(e: React.PointerEvent<HTMLDivElement>) {
    const state = dragStateRef.current;
    if (!state.active) return;

    const dx = e.clientX - state.startX;
    const wasMoved = state.moved;

    state.active = false;
    state.moved = false;
    setIsDragging(false);
    setDragOffset(0);

    if (wasMoved) {
      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 60);

      if (Math.abs(dx) >= 60) {
        setSelectedDate((d) => addDays(d, dx < 0 ? 7 : -7));
      }
    }
  }

  const [form, setForm] = useState({
    clientId: clients[0]?.id ?? "",
    professionalId: professionals[0]?.id ?? "",
    serviceIds: services[0] ? [services[0].id] : ([] as string[]),
    date: toLocalDateKey(new Date()),
    startTime: "09:00",
    durationMinutes: services[0]?.durationMinutes ?? 30,
    totalPriceReais: (services[0]?.priceCents ?? 0) / 100,
    status: "waiting" as AppointmentStatus,
    allowOverbooking: false,
    notes: "",
  });

  const filteredAppointments = useMemo(() => {
    return initialAppointments.filter((a) => {
      if (professionalFilter !== "all" && a.professionalId !== professionalFilter) {
        return false;
      }
      if (statusFilter !== "all" && a.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [initialAppointments, professionalFilter, statusFilter]);

  const dayAppointments = useMemo(
    () =>
      filteredAppointments.filter(
        (a) => toLocalDateKey(a.startsAtIso) === selectedDate
      ),
    [filteredAppointments, selectedDate]
  );

  const weekDates = useMemo(() => {
    const base = new Date(`${selectedDate}T12:00:00-03:00`);
    const dow = base.getDay();
    const sundayOffset = -dow;
    return Array.from({ length: 7 }, (_, i) => addDays(selectedDate, sundayOffset + i));
  }, [selectedDate]);

  const selectedWeekAppointments = useMemo(() => {
    const weekSet = new Set(weekDates);
    return filteredAppointments.filter((a) =>
      weekSet.has(toLocalDateKey(a.startsAtIso))
    );
  }, [filteredAppointments, weekDates]);

  const filteredOpenFutureAppointments = useMemo(() => {
    return openFutureAppointments.filter((a) => {
      if (professionalFilter !== "all" && a.professionalId !== professionalFilter) {
        return false;
      }
      if (statusFilter !== "all" && a.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [openFutureAppointments, professionalFilter, statusFilter]);

  const monthCalendarCells = useMemo(
    () => getMonthCalendarCells(selectedDate),
    [selectedDate]
  );

  function openCreate(presetDate?: string, presetStartTime?: string) {
    setEditingId(null);
    const firstSvc = services[0];
    setForm({
      clientId: clients[0]?.id ?? "",
      professionalId:
        professionalFilter !== "all"
          ? professionalFilter
          : professionals[0]?.id ?? "",
      serviceIds: firstSvc ? [firstSvc.id] : [],
      date: presetDate || selectedDate,
      startTime: presetStartTime || "09:00",
      durationMinutes: firstSvc ? firstSvc.durationMinutes + firstSvc.bufferMinutes : 30,
      totalPriceReais: firstSvc ? firstSvc.priceCents / 100 : 0,
      status: "waiting",
      allowOverbooking: false,
      notes: "",
    });
    setModalOpen(true);
  }

  function openEdit(appt: AgendaAppointmentRow) {
    setEditingId(appt.id);
    setForm({
      clientId: appt.clientId,
      professionalId: appt.professionalId,
      serviceIds: appt.services.map((s) => s.serviceId),
      date: toLocalDateKey(appt.startsAtIso),
      startTime: toLocalTime(appt.startsAtIso),
      durationMinutes: appt.durationMinutes,
      totalPriceReais: appt.totalPriceCents / 100,
      status: appt.status,
      allowOverbooking: appt.isOverbooking,
      notes: appt.notes ?? "",
    });
    setModalOpen(true);
  }

  function toggleService(serviceId: string) {
    setForm((prev) => {
      const nextIds = prev.serviceIds.includes(serviceId)
        ? prev.serviceIds.filter((id) => id !== serviceId)
        : [...prev.serviceIds, serviceId];

      const selectedServices = services.filter((s) => nextIds.includes(s.id));
      const totalDuration = selectedServices.reduce(
        (acc, s) => acc + s.durationMinutes + s.bufferMinutes,
        0
      );
      const totalPriceCents = selectedServices.reduce(
        (acc, s) => acc + s.priceCents,
        0
      );

      return {
        ...prev,
        serviceIds: nextIds,
        durationMinutes: totalDuration > 0 ? totalDuration : prev.durationMinutes,
        totalPriceReais: totalPriceCents / 100,
      };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.clientId || !form.professionalId) {
      toast.error("Cadastre pelo menos um cliente e um profissional antes de agendar.");
      return;
    }
    if (form.serviceIds.length === 0) {
      toast.error("Selecione pelo menos um serviço.");
      return;
    }

    setSaving(true);
    const result = editingId
      ? await updateAppointmentAction(editingId, form)
      : await createAppointmentAction(form);
    setSaving(false);

    if (!result.success) {
      toast.error(result.error || "Não foi possível salvar o agendamento.");
      return;
    }

    toast.success(editingId ? "Agendamento atualizado!" : "Agendamento criado!");
    setModalOpen(false);
    router.refresh();
  }

  async function handleQuickStatus(appt: AgendaAppointmentRow, status: AppointmentStatus) {
    let cancellationReason = "";
    if (status === "cancelled") {
      const reason = window.prompt("Motivo do cancelamento (opcional):");
      if (reason === null) return;
      cancellationReason = reason;
    }

    const result = await updateAppointmentStatusAction(appt.id, {
      status,
      cancellationReason,
    });

    if (!result.success) {
      toast.error(result.error || "Erro ao atualizar status.");
      return;
    }

    toast.success(`Status alterado para ${STATUS_META[status].label}.`);
    router.refresh();
  }

  function stepDate(direction: -1 | 1) {
    if (view === "week") {
      setSelectedDate((d) => addDays(d, direction * 7));
    } else if (view === "month") {
      setSelectedDate((d) => addDays(d, direction * 30));
    } else {
      setSelectedDate((d) => addDays(d, direction));
    }
  }

  function renderAppointmentCard(
    appt: AgendaAppointmentRow,
    options?: { showDate?: boolean; showJumpToDay?: boolean }
  ) {
    const meta = STATUS_META[appt.status];
    const apptDateKey = toLocalDateKey(appt.startsAtIso);
    const shouldShowDate = options?.showDate || view === "list";

    return (
      <Card
        key={appt.id}
        onClick={() => setDetailAppt(appt)}
        className="overflow-hidden cursor-pointer transition-colors hover:border-[#2563EB]/50"
      >
        <CardContent className="p-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3 min-w-0">
              <div
                className="flex flex-col items-center justify-center rounded-xl px-3 py-2 text-white shrink-0"
                style={{ backgroundColor: appt.professionalColor }}
              >
                <span className="text-sm font-extrabold leading-none">
                  {toLocalTime(appt.startsAtIso)}
                </span>
                <span className="mt-1 text-[10px] opacity-90">
                  {appt.durationMinutes}m
                </span>
              </div>

              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold text-[#142B4F]">{appt.clientName}</p>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                      meta.className
                    )}
                  >
                    {meta.label}
                  </span>
                  {appt.isOverbooking && (
                    <Badge variant="orange" className="text-[10px]">
                      Encaixe
                    </Badge>
                  )}
                </div>

                <p className="text-xs text-[#64748B]">
                  <strong className="text-[#142B4F]">{appt.professionalName}</strong> •{" "}
                  {appt.services.map((s) => s.serviceName).join(", ") || "Serviço"}
                </p>

                <p className="text-xs font-semibold text-[#2563EB]">
                  {formatCurrencyBRL(appt.totalPriceCents)}
                  {shouldShowDate && ` • ${formatReadableDate(apptDateKey)}`}
                </p>
              </div>
            </div>

            <div
              className="flex flex-wrap items-center gap-1.5"
              onClick={(e) => e.stopPropagation()}
            >
              {options?.showJumpToDay && apptDateKey !== selectedDate && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedDate(apptDateKey)}
                  title="Abrir esta data no calendário"
                >
                  Ir para o dia
                </Button>
              )}
              {canWrite && (
                <>
                  {appt.status === "waiting" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleQuickStatus(appt, "confirmed")}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Confirmar
                    </Button>
                  )}
                  {(appt.status === "waiting" || appt.status === "confirmed") && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleQuickStatus(appt, "in_progress")}
                    >
                      <Play className="h-3.5 w-3.5" />
                      Iniciar
                    </Button>
                  )}
                  {appt.status === "in_progress" && (
                    <Button
                      size="sm"
                      onClick={() => handleQuickStatus(appt, "completed")}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Concluir
                    </Button>
                  )}
                  {appt.clientPhone && (
                    <Button
                      size="sm"
                      variant="ghost"
                      asChild
                      title="Abrir lembrete no WhatsApp"
                    >
                      <a
                        href={
                          buildWhatsAppUrl(
                            appt.clientPhone,
                            `Olá, ${appt.clientName}! Lembrando do seu agendamento para ${formatReadableDate(
                              apptDateKey
                            )} às ${toLocalTime(appt.startsAtIso)} com ${
                              appt.professionalName
                            }.`
                          ) ?? "#"
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                      </a>
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => openEdit(appt)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  {canDelete &&
                    appt.status !== "cancelled" &&
                    appt.status !== "completed" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleQuickStatus(appt, "cancelled")}
                        title="Cancelar agendamento"
                      >
                        <XCircle className="h-3.5 w-3.5 text-red-600" />
                      </Button>
                    )}
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Controls bar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
            {(
              [
                ["day", "Dia"],
                ["week", "Semana"],
                ["month", "Mês"],
                ["list", "Lista"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setView(key)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer",
                  view === key
                    ? "bg-[#2563EB] text-white"
                    : "text-[#64748B] hover:text-[#142B4F]"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-1">
            <button
              type="button"
              onClick={() => stepDate(-1)}
              className="rounded-md p-1 hover:bg-slate-100 cursor-pointer"
              aria-label="Período anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(toLocalDateKey(new Date()))}
              className="px-2 text-xs font-semibold text-[#142B4F] hover:text-[#2563EB] cursor-pointer"
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={() => stepDate(1)}
              className="rounded-md p-1 hover:bg-slate-100 cursor-pointer"
              aria-label="Próximo período"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="h-9 w-auto"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={professionalFilter}
            onChange={(e) => setProfessionalFilter(e.target.value)}
            className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-[#142B4F]"
            aria-label="Filtrar por profissional"
          >
            <option value="all">Todos os profissionais</option>
            {professionals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-[#142B4F]"
            aria-label="Filtrar por status"
          >
            <option value="all">Todos os status</option>
            {Object.entries(STATUS_META).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>

          <Button variant="outline" size="sm" asChild>
            <Link href="/app/agenda/disponibilidade">
              <Settings2 className="h-4 w-4" />
              Horários e Bloqueios
            </Link>
          </Button>

          {canWrite && (
            <Button size="sm" onClick={() => openCreate()}>
              <Plus className="h-4 w-4" />
              Novo agendamento
            </Button>
          )}
        </div>
      </div>

      {/* Prerequisite warning if no clients/professionals/services */}
      {(clients.length === 0 || professionals.length === 0 || services.length === 0) && (
        <Card className="border-amber-200 bg-[#FFF0E5]/60">
          <CardContent className="flex items-center gap-3 p-4 text-xs text-[#142B4F]">
            <AlertTriangle className="h-5 w-5 shrink-0 text-[#FF914D]" />
            <span>
              Para criar agendamentos, certifique-se de ter ao menos 1{" "}
              <Link href="/app/clientes" className="font-bold text-[#2563EB] underline">
                cliente
              </Link>
              , 1{" "}
              <Link href="/app/profissionais" className="font-bold text-[#2563EB] underline">
                profissional
              </Link>{" "}
              e 1{" "}
              <Link href="/app/servicos" className="font-bold text-[#2563EB] underline">
                serviço
              </Link>{" "}
              cadastrados.
            </span>
          </CardContent>
        </Card>
      )}

      {/* INTERACTIVE WEEK DAY STRIP (visible in Dia, Semana & Mês) */}
      {view !== "list" && (
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-extrabold text-[#142B4F]">
                {formatMonthYear(selectedDate)}
              </h2>
              <p className="text-xs text-[#64748B]">
                Semana: {formatWeekRange(weekDates)}
              </p>
            </div>
            <p className="text-[11px] text-[#64748B]">
              Arraste com o mouse, deslize com o dedo ou role a roda para trocar de semana
            </p>
          </div>

          <div
            ref={weekContainerRef}
            onPointerDown={handleWeekPointerDown}
            onPointerMove={handleWeekPointerMove}
            onPointerUp={finishWeekDrag}
            onPointerCancel={finishWeekDrag}
            onPointerLeave={finishWeekDrag}
            onClickCapture={(e) => {
              if (suppressClickRef.current) {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
            className={cn(
              "overflow-hidden rounded-2xl touch-pan-y select-none",
              isDragging ? "cursor-grabbing" : "cursor-grab"
            )}
          >
            <div
              className={cn(
                "grid grid-cols-7 gap-1 sm:gap-2",
                !isDragging && "transition-transform duration-200 ease-out"
              )}
              style={{
                transform:
                  dragOffset !== 0 ? `translateX(${dragOffset}px)` : undefined,
              }}
            >
              {weekDates.map((dKey) => {
                const count = filteredAppointments.filter(
                  (a) => toLocalDateKey(a.startsAtIso) === dKey
                ).length;
                const { weekday, day, month } = getDayCardParts(dKey);
                const isSelected = dKey === selectedDate;

                return (
                  <button
                    key={dKey}
                    type="button"
                    onClick={() => setSelectedDate(dKey)}
                    className={cn(
                      "flex min-w-0 flex-col items-center justify-center rounded-xl border px-1 py-2 text-center transition-all cursor-pointer sm:px-2 sm:py-2.5",
                      isSelected
                        ? "border-[#2563EB] bg-[#EAF2FF] text-[#2563EB] ring-1 ring-[#2563EB]/30"
                        : "border-slate-200 bg-white text-[#142B4F] hover:border-[#2563EB]/50"
                    )}
                  >
                    <span className="text-[9px] font-bold tracking-wide opacity-75 sm:text-[10px]">
                      {weekday}
                    </span>
                    <span className="mt-0.5 text-base font-extrabold leading-none sm:text-lg">
                      {day}
                    </span>
                    <span className="mt-0.5 text-[9px] font-medium opacity-75 sm:text-[10px]">
                      {month}
                    </span>
                    {count > 0 && (
                      <span
                        className={cn(
                          "mt-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold leading-none",
                          isSelected
                            ? "bg-[#2563EB] text-white"
                            : "bg-slate-100 text-[#142B4F]"
                        )}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* DAY VIEW — Hourly Time Grid */}
      {view === "day" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wide text-[#64748B]">
              Horários de {formatReadableDate(selectedDate)} ({dayAppointments.length} agendamentos)
            </h3>
          </div>

          <AgendaTimeGrid
            days={[selectedDate]}
            selectedDate={selectedDate}
            appointments={filteredAppointments}
            scheduleBlocks={scheduleBlocks}
            canWrite={canWrite}
            onSelectDay={setSelectedDate}
            onSlotClick={(dKey, startTime) => openCreate(dKey, startTime)}
            onAppointmentClick={(appt) => setDetailAppt(appt)}
          />

          {dayAppointments.length > 0 && (
            <div className="space-y-2.5 pt-2">
              <p className="text-xs font-bold uppercase tracking-wide text-[#64748B]">
                Ações rápidas do dia
              </p>
              {dayAppointments.map((appt) => renderAppointmentCard(appt))}
            </div>
          )}
        </div>
      )}

      {/* WEEK VIEW — 7-Column Hourly Time Grid */}
      {view === "week" && (
        <AgendaTimeGrid
          days={weekDates}
          selectedDate={selectedDate}
          appointments={filteredAppointments}
          scheduleBlocks={scheduleBlocks}
          canWrite={canWrite}
          onSelectDay={(dKey) => setSelectedDate(dKey)}
          onSlotClick={(dKey, startTime) => openCreate(dKey, startTime)}
          onAppointmentClick={(appt) => setDetailAppt(appt)}
        />
      )}

      {/* MONTH VIEW — Calendar Grid + Selected Day Hourly Time Grid below */}
      {view === "month" && (
        <div className="space-y-5">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="grid grid-cols-7 border-b border-slate-200 bg-[#F5F7FA] text-center text-xs font-bold text-[#142B4F]">
              {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((label) => (
                <div
                  key={label}
                  className="border-r border-slate-200 py-2 last:border-r-0"
                >
                  {label}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {monthCalendarCells.map(({ dateKey: dKey, inCurrentMonth }) => {
                const dayAppts = filteredAppointments.filter(
                  (a) => toLocalDateKey(a.startsAtIso) === dKey
                );
                const hasBlock = scheduleBlocks.some((b) => {
                  const s = new Date(b.startsAtIso).getTime();
                  const e = new Date(b.endsAtIso).getTime();
                  const ds = new Date(`${dKey}T00:00:00-03:00`).getTime();
                  const de = new Date(`${dKey}T23:59:59-03:00`).getTime();
                  return e > ds && s < de;
                });
                const dayNum = Number(dKey.slice(8, 10));
                const isSelected = dKey === selectedDate;

                return (
                  <button
                    key={dKey}
                    type="button"
                    onClick={() => setSelectedDate(dKey)}
                    className={cn(
                      "flex min-h-[82px] flex-col items-stretch justify-start gap-1 border-b border-r border-slate-200 p-1.5 text-left transition-colors last:border-r-0 cursor-pointer sm:min-h-[96px] sm:p-2",
                      isSelected
                        ? "bg-[#EAF2FF]/70 ring-2 ring-inset ring-[#2563EB]"
                        : inCurrentMonth
                          ? "bg-white hover:bg-slate-50"
                          : "bg-slate-50/70 text-slate-400 hover:bg-slate-100/70"
                    )}
                  >
                    <span
                      className={cn(
                        "self-end text-xs font-bold",
                        isSelected
                          ? "text-[#2563EB]"
                          : inCurrentMonth
                            ? "text-[#142B4F]"
                            : "text-slate-400"
                      )}
                    >
                      {dayNum}
                    </span>

                    {hasBlock && (
                      <span className="truncate rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        BLOQ / FERIADO
                      </span>
                    )}

                    {dayAppts.length === 1 && (
                      <span className="truncate rounded bg-[#142B4F] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        {toLocalTime(dayAppts[0]!.startsAtIso)}{" "}
                        {dayAppts[0]!.clientName}
                      </span>
                    )}

                    {dayAppts.length > 1 && (
                      <span className="inline-flex w-fit rounded bg-[#2563EB] px-1.5 py-0.5 text-[10px] font-bold text-white">
                        mais +{dayAppts.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Day Hourly Schedule directly below Month grid */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wide text-[#64748B]">
                Horários de {formatReadableDate(selectedDate)} ({dayAppointments.length} agendamentos)
              </h3>
              {canWrite && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openCreate(selectedDate)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Agendar neste dia
                </Button>
              )}
            </div>

            <AgendaTimeGrid
              days={[selectedDate]}
              selectedDate={selectedDate}
              appointments={filteredAppointments}
              scheduleBlocks={scheduleBlocks}
              canWrite={canWrite}
              onSelectDay={setSelectedDate}
              onSlotClick={(dKey, startTime) => openCreate(dKey, startTime)}
              onAppointmentClick={(appt) => setDetailAppt(appt)}
            />
          </div>
        </div>
      )}

      {/* LIST VIEW */}
      {view === "list" && (
        <div className="space-y-3">
          {filteredAppointments.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center py-12 text-center">
                <CalendarIcon className="h-10 w-10 text-[#2563EB]" />
                <p className="mt-3 font-bold text-[#142B4F]">
                  Nenhum agendamento encontrado no período
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredAppointments.map((appt) =>
              renderAppointmentCard(appt, { showDate: true })
            )
          )}
        </div>
      )}

      {/* PERSISTENT OPEN FUTURE & SELECTED WEEK APPOINTMENTS SECTION */}
      {view !== "list" && (
        <div className="space-y-3 pt-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-[#64748B]">
                Acompanhamento de agendamentos
              </h3>
              <p className="text-[11px] text-[#64748B]">
                Visualize os agendamentos futuros em aberto (independente da semana selecionada) ou todos os atendimentos da semana exibida.
              </p>
            </div>

            <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 self-start">
              <button
                type="button"
                onClick={() => setBottomTab("future")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer",
                  bottomTab === "future"
                    ? "bg-[#2563EB] text-white"
                    : "text-[#64748B] hover:text-[#142B4F]"
                )}
              >
                <span>Futuros em aberto</span>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
                    bottomTab === "future"
                      ? "bg-white/20 text-white"
                      : "bg-[#FFF0E5] text-[#C2410C]"
                  )}
                >
                  {filteredOpenFutureAppointments.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setBottomTab("selected_week")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer",
                  bottomTab === "selected_week"
                    ? "bg-[#2563EB] text-white"
                    : "text-[#64748B] hover:text-[#142B4F]"
                )}
              >
                <span>Semana selecionada</span>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
                    bottomTab === "selected_week"
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-[#142B4F]"
                  )}
                >
                  {selectedWeekAppointments.length}
                </span>
              </button>
            </div>
          </div>

          {bottomTab === "future" ? (
            filteredOpenFutureAppointments.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center text-xs text-[#64748B]">
                  Nenhum agendamento futuro em aberto encontrado.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2.5">
                {filteredOpenFutureAppointments.map((appt) =>
                  renderAppointmentCard(appt, {
                    showDate: true,
                    showJumpToDay: true,
                  })
                )}
              </div>
            )
          ) : selectedWeekAppointments.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-xs text-[#64748B]">
                Nenhum agendamento registrado na semana de {formatWeekRange(weekDates)}.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2.5">
              <p className="text-[11px] font-medium text-[#64748B]">
                Semana de {formatWeekRange(weekDates)} •{" "}
                {
                  selectedWeekAppointments.filter(
                    (a) => a.status === "completed"
                  ).length
                }{" "}
                concluído(s) •{" "}
                {
                  selectedWeekAppointments.filter(
                    (a) =>
                      a.status === "waiting" ||
                      a.status === "confirmed" ||
                      a.status === "in_progress"
                  ).length
                }{" "}
                em aberto
              </p>
              {selectedWeekAppointments.map((appt) =>
                renderAppointmentCard(appt, { showDate: true })
              )}
            </div>
          )}
        </div>
      )}

      {/* Active Schedule Blocks strip */}
      {scheduleBlocks.length > 0 && (
        <Card className="bg-white">
          <CardContent className="p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-[#64748B]">
              Próximos bloqueios / feriados ativos ({scheduleBlocks.length})
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {scheduleBlocks.slice(0, 6).map((b) => (
                <Badge key={b.id} variant="orange">
                  <Clock className="h-3 w-3" />
                  {b.title} ({b.professionalName ?? "Toda empresa"})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create / Edit Appointment Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Editar / Reagendar atendimento" : "Novo agendamento"}
        description="Conflitos de horário e bloqueios são validados automaticamente no servidor."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="a-client">Cliente *</Label>
              <select
                id="a-client"
                value={form.clientId}
                onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#142B4F]"
                required
              >
                <option value="">Selecione...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="a-prof">Profissional *</Label>
              <select
                id="a-prof"
                value={form.professionalId}
                onChange={(e) => setForm({ ...form, professionalId: e.target.value })}
                className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#142B4F]"
                required
              >
                <option value="">Selecione...</option>
                {professionals.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Serviços * (múltipla seleção)</Label>
            <div className="grid max-h-36 grid-cols-1 gap-2 overflow-y-auto rounded-xl border border-slate-200 bg-[#F5F7FA] p-3 sm:grid-cols-2">
              {services.map((svc) => (
                <label
                  key={svc.id}
                  className="flex items-center justify-between gap-2 text-xs text-[#142B4F] cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.serviceIds.includes(svc.id)}
                      onChange={() => toggleService(svc.id)}
                    />
                    <span className="font-medium">{svc.name}</span>
                  </span>
                  <span className="text-[#64748B]">
                    {svc.durationMinutes}m • {formatCurrencyBRL(svc.priceCents)}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="a-date">Data *</Label>
              <Input
                id="a-date"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="a-time">Horário *</Label>
              <Input
                id="a-time"
                type="time"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="a-dur">Duração (min)</Label>
              <Input
                id="a-dur"
                type="number"
                min="5"
                value={form.durationMinutes}
                onChange={(e) =>
                  setForm({ ...form, durationMinutes: Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="a-price">Valor (R$)</Label>
              <Input
                id="a-price"
                type="number"
                step="0.01"
                min="0"
                value={form.totalPriceReais}
                onChange={(e) =>
                  setForm({ ...form, totalPriceReais: Number(e.target.value) })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="a-status">Status</Label>
              <select
                id="a-status"
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as AppointmentStatus })
                }
                className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#142B4F]"
              >
                {Object.entries(STATUS_META).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>

            {canOverbook && (
              <div className="flex items-end">
                <label className="flex h-10 w-full items-center gap-2 rounded-lg border border-slate-200 bg-[#FFF0E5]/60 px-3 text-xs font-medium text-[#142B4F] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.allowOverbooking}
                    onChange={(e) =>
                      setForm({ ...form, allowOverbooking: e.target.checked })
                    }
                  />
                  Permitir encaixe se horário estiver ocupado
                </label>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="a-notes">Observações</Label>
            <textarea
              id="a-notes"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-[#142B4F]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingId ? "Salvar alterações" : "Confirmar agendamento"}
            </Button>
          </div>
        </form>
      </Modal>
      {/* Appointment Detail Modal (Quick Actions, Client Tabs & Birthday Fireworks) */}
      <AppointmentDetailModal
        appointment={detailAppt}
        organizationName={organizationName}
        canWrite={canWrite}
        canDelete={canDelete}
        canWriteClients={canWriteClients}
        onClose={() => setDetailAppt(null)}
        onEditAppointment={(appt) => openEdit(appt)}
        onQuickStatus={handleQuickStatus}
      />
    </div>
  );
}

