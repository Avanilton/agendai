"use client";

import { useMemo } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  AgendaAppointmentRow,
  AgendaBlockRow,
} from "@/components/agenda/agenda-manager";

const GRID_START_HOUR = 7;
const GRID_END_HOUR = 21;
const SLOT_MINUTES = 30;
const SLOT_HEIGHT_PX = 46;
const TOTAL_SLOTS = ((GRID_END_HOUR - GRID_START_HOUR) * 60) / SLOT_MINUTES;
const TOTAL_HEIGHT_PX = TOTAL_SLOTS * SLOT_HEIGHT_PX;
const PX_PER_MINUTE = SLOT_HEIGHT_PX / SLOT_MINUTES;

const TIME_SLOTS = Array.from({ length: TOTAL_SLOTS }, (_, idx) => {
  const totalMinutes = GRID_START_HOUR * 60 + idx * SLOT_MINUTES;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const hh = String(h).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  return {
    index: idx,
    time24: `${hh}:${mm}`,
    label: m === 0 ? `${h}` : `${h}:${mm}`,
    isHour: m === 0,
  };
});

function toLocalDateKey(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(iso));
  const y = parts.find((p) => p.type === "year")?.value ?? "2026";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${y}-${m}-${d}`;
}

function toLocalTime(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function getLocalMinutes(iso: string): number {
  const [h, m] = toLocalTime(iso).split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function formatColHeader(dateKey: string): { weekday: string; dayMonth: string } {
  const d = new Date(`${dateKey}T12:00:00-03:00`);
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).formatToParts(d);
  const rawW = parts.find((p) => p.type === "weekday")?.value ?? "";
  const cleanW = rawW.replace(".", "");
  const weekday = cleanW.charAt(0).toUpperCase() + cleanW.slice(1);
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  return { weekday, dayMonth: `${day}/${month}` };
}

interface PositionedAppt {
  appt: AgendaAppointmentRow;
  topPx: number;
  heightPx: number;
  colIndex: number;
  colCount: number;
}

function computeDayAppointmentsLayout(
  dayAppts: AgendaAppointmentRow[]
): PositionedAppt[] {
  const sorted = [...dayAppts].sort(
    (a, b) => new Date(a.startsAtIso).getTime() - new Date(b.startsAtIso).getTime()
  );

  const items = sorted.map((appt) => {
    const startMin = getLocalMinutes(appt.startsAtIso);
    const endMin = Math.max(startMin + 15, startMin + appt.durationMinutes);
    return { appt, startMin, endMin };
  });

  // Group into overlapping clusters
  const positioned: PositionedAppt[] = [];
  let cluster: typeof items = [];
  let clusterMaxEnd = -1;

  const flushCluster = () => {
    if (cluster.length === 0) return;
    const laneEnds: number[] = [];
    const assigned: { item: (typeof items)[number]; lane: number }[] = [];

    for (const item of cluster) {
      let lane = laneEnds.findIndex((end) => end <= item.startMin);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(item.endMin);
      } else {
        laneEnds[lane] = item.endMin;
      }
      assigned.push({ item, lane });
    }

    const colCount = Math.max(1, laneEnds.length);
    for (const { item, lane } of assigned) {
      const clampedStart = Math.max(GRID_START_HOUR * 60, item.startMin);
      const clampedEnd = Math.min(GRID_END_HOUR * 60, item.endMin);
      if (clampedEnd <= GRID_START_HOUR * 60 || clampedStart >= GRID_END_HOUR * 60) {
        continue;
      }
      const topPx = (clampedStart - GRID_START_HOUR * 60) * PX_PER_MINUTE;
      const heightPx = Math.max(
        28,
        (clampedEnd - clampedStart) * PX_PER_MINUTE - 2
      );
      positioned.push({
        appt: item.appt,
        topPx,
        heightPx,
        colIndex: lane,
        colCount,
      });
    }

    cluster = [];
    clusterMaxEnd = -1;
  };

  for (const item of items) {
    if (cluster.length === 0 || item.startMin < clusterMaxEnd) {
      cluster.push(item);
      clusterMaxEnd = Math.max(clusterMaxEnd, item.endMin);
    } else {
      flushCluster();
      cluster.push(item);
      clusterMaxEnd = item.endMin;
    }
  }
  flushCluster();

  return positioned;
}

interface PositionedBlock {
  block: AgendaBlockRow;
  topPx: number;
  heightPx: number;
  timeLabel: string;
}

function computeDayBlocks(
  dateKey: string,
  blocks: AgendaBlockRow[]
): PositionedBlock[] {
  const dayStartMs = new Date(`${dateKey}T00:00:00-03:00`).getTime();
  const dayEndMs = new Date(`${dateKey}T23:59:59-03:00`).getTime();

  const result: PositionedBlock[] = [];
  for (const block of blocks) {
    const bStart = new Date(block.startsAtIso).getTime();
    const bEnd = new Date(block.endsAtIso).getTime();
    if (bEnd <= dayStartMs || bStart >= dayEndMs) continue;

    const startMin =
      bStart <= dayStartMs
        ? GRID_START_HOUR * 60
        : Math.max(GRID_START_HOUR * 60, getLocalMinutes(block.startsAtIso));
    const endMin =
      bEnd >= dayEndMs
        ? GRID_END_HOUR * 60
        : Math.min(GRID_END_HOUR * 60, getLocalMinutes(block.endsAtIso));

    if (endMin <= startMin) continue;

    const topPx = (startMin - GRID_START_HOUR * 60) * PX_PER_MINUTE;
    const heightPx = Math.max(26, (endMin - startMin) * PX_PER_MINUTE - 2);
    result.push({
      block,
      topPx,
      heightPx,
      timeLabel: toLocalTime(block.startsAtIso),
    });
  }

  return result;
}

interface AgendaTimeGridProps {
  days: string[];
  selectedDate: string;
  appointments: AgendaAppointmentRow[];
  scheduleBlocks: AgendaBlockRow[];
  canWrite: boolean;
  onSelectDay: (dateKey: string) => void;
  onSlotClick: (dateKey: string, startTime: string) => void;
  onAppointmentClick: (appt: AgendaAppointmentRow) => void;
}

export function AgendaTimeGrid({
  days,
  selectedDate,
  appointments,
  scheduleBlocks,
  canWrite,
  onSelectDay,
  onSlotClick,
  onAppointmentClick,
}: AgendaTimeGridProps) {
  const isSingleDay = days.length === 1;

  const byDay = useMemo(() => {
    const map = new Map<
      string,
      { appts: PositionedAppt[]; blocks: PositionedBlock[] }
    >();
    for (const dKey of days) {
      const dayAppts = appointments.filter(
        (a) => toLocalDateKey(a.startsAtIso) === dKey
      );
      map.set(dKey, {
        appts: computeDayAppointmentsLayout(dayAppts),
        blocks: computeDayBlocks(dKey, scheduleBlocks),
      });
    }
    return map;
  }, [days, appointments, scheduleBlocks]);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
      <div className="max-h-[68vh] overflow-auto">
        <div
          className={cn(
            "relative",
            !isSingleDay && "min-w-[680px]"
          )}
        >
          {/* Sticky Header Row */}
          <div
            className="sticky top-0 z-20 grid border-b border-slate-200 bg-white"
            style={{
              gridTemplateColumns: `60px repeat(${days.length}, minmax(0, 1fr))`,
            }}
          >
            <div className="sticky left-0 z-30 flex items-center justify-center border-r border-slate-200 bg-white py-2.5 text-[11px] font-semibold text-[#64748B]">
              Hora
            </div>
            {days.map((dKey) => {
              const { weekday, dayMonth } = formatColHeader(dKey);
              const isSelected = dKey === selectedDate;
              return (
                <button
                  key={dKey}
                  type="button"
                  onClick={() => onSelectDay(dKey)}
                  className={cn(
                    "flex flex-col items-center justify-center border-r border-slate-200 py-2 text-center transition-colors last:border-r-0 cursor-pointer",
                    isSelected
                      ? "bg-[#EAF2FF] text-[#2563EB]"
                      : "text-[#142B4F] hover:bg-slate-50"
                  )}
                >
                  <span className="text-xs font-bold">{weekday}</span>
                  <span className="text-xs font-semibold opacity-80">
                    {dayMonth}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Grid Body */}
          <div
            className="grid"
            style={{
              gridTemplateColumns: `60px repeat(${days.length}, minmax(0, 1fr))`,
              height: `${TOTAL_HEIGHT_PX}px`,
            }}
          >
            {/* Left Time Axis */}
            <div className="sticky left-0 z-10 border-r border-slate-200 bg-white">
              {TIME_SLOTS.map((slot) => (
                <div
                  key={slot.time24}
                  className={cn(
                    "flex items-start justify-end pr-2 pt-1 text-[11px] font-medium text-[#64748B]",
                    slot.isHour
                      ? "border-t border-slate-200"
                      : "border-t border-dashed border-slate-100"
                  )}
                  style={{ height: `${SLOT_HEIGHT_PX}px` }}
                >
                  {slot.label}
                </div>
              ))}
            </div>

            {/* Day Columns */}
            {days.map((dKey) => {
              const entry = byDay.get(dKey) ?? { appts: [], blocks: [] };
              const isSelected = dKey === selectedDate;

              return (
                <div
                  key={dKey}
                  className={cn(
                    "relative border-r border-slate-200 last:border-r-0",
                    isSelected && !isSingleDay && "bg-[#EAF2FF]/20"
                  )}
                  style={{ height: `${TOTAL_HEIGHT_PX}px` }}
                >
                  {/* Clickable 30-min background slots */}
                  {TIME_SLOTS.map((slot) => (
                    <button
                      key={slot.time24}
                      type="button"
                      disabled={!canWrite}
                      onClick={() => canWrite && onSlotClick(dKey, slot.time24)}
                      title={
                        canWrite
                          ? `Agendar em ${dKey} às ${slot.time24}`
                          : undefined
                      }
                      className={cn(
                        "group flex w-full items-center justify-end px-2 text-left transition-colors",
                        slot.isHour
                          ? "border-t border-slate-200"
                          : "border-t border-dashed border-slate-100",
                        canWrite && "hover:bg-[#EAF2FF]/50 cursor-pointer"
                      )}
                      style={{ height: `${SLOT_HEIGHT_PX}px` }}
                    >
                      {canWrite && (
                        <span className="hidden items-center gap-0.5 text-[10px] font-semibold text-[#2563EB] group-hover:inline-flex">
                          <Plus className="h-3 w-3" />
                          {isSingleDay ? `Agendar ${slot.time24}` : slot.time24}
                        </span>
                      )}
                    </button>
                  ))}

                  {/* Schedule Blocks (BLOQ / Feriado) */}
                  {entry.blocks.map(({ block, topPx, heightPx, timeLabel }) => (
                    <div
                      key={block.id}
                      className="pointer-events-none absolute left-1 right-1 z-[5] overflow-hidden rounded-lg border border-slate-400/60 bg-slate-600/85 px-1.5 py-1 text-white shadow-xs"
                      style={{
                        top: `${topPx + 1}px`,
                        height: `${heightPx}px`,
                      }}
                    >
                      <p className="truncate text-[10px] font-bold leading-tight">
                        {timeLabel} •{" "}
                        {block.type === "holiday" ? "FERIADO" : "BLOQ"}
                      </p>
                      <p className="truncate text-[10px] opacity-90 leading-tight">
                        {block.title}
                      </p>
                    </div>
                  ))}

                  {/* Positioned Appointments */}
                  {entry.appts.map(
                    ({ appt, topPx, heightPx, colIndex, colCount }) => {
                      const widthPct = 100 / colCount;
                      const leftPct = colIndex * widthPct;
                      const isCancelled = appt.status === "cancelled";

                      return (
                        <button
                          key={appt.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAppointmentClick(appt);
                          }}
                          className={cn(
                            "absolute z-10 overflow-hidden rounded-lg border border-white/30 px-1.5 py-1 text-left text-white shadow-xs transition-transform hover:z-20 hover:brightness-105 cursor-pointer",
                            isCancelled && "opacity-55 line-through"
                          )}
                          style={{
                            top: `${topPx + 1}px`,
                            height: `${heightPx}px`,
                            left: `calc(${leftPct}% + 2px)`,
                            width: `calc(${widthPct}% - 4px)`,
                            backgroundColor: appt.professionalColor || "#2563EB",
                          }}
                        >
                          <p className="truncate text-[10px] font-semibold leading-tight opacity-95">
                            {toLocalTime(appt.startsAtIso)}
                            {isSingleDay
                              ? ` – ${toLocalTime(appt.endsAtIso)}`
                              : ""}
                          </p>
                          <p className="truncate text-[11px] font-bold leading-tight">
                            {appt.clientName}
                          </p>
                          {heightPx >= 42 && (
                            <p className="truncate text-[10px] leading-tight opacity-90">
                              {appt.services.map((s) => s.serviceName).join(", ") ||
                                appt.professionalName}
                            </p>
                          )}
                        </button>
                      );
                    }
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

