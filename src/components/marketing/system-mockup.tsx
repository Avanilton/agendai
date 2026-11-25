import {
  CalendarCheck2,
  Clock,
  TrendingUp,
  Users,
  CheckCircle2,
  MessageCircle,
} from "lucide-react";

const SAMPLE_SLOTS = [
  { time: "09:00", title: "Avaliação inicial", pro: "Dra. Camila", status: "Confirmado", tone: "bg-emerald-50 text-emerald-700" },
  { time: "10:30", title: "Atendimento retorno", pro: "Dr. Rafael", status: "Em atendimento", tone: "bg-[#EAF2FF] text-[#2563EB]" },
  { time: "14:00", title: "Sessão personalizada", pro: "Ana Souza", status: "Aguardando", tone: "bg-[#FFF0E5] text-[#C2410C]" },
  { time: "15:30", title: "Consulta online", pro: "Dra. Camila", status: "Confirmado", tone: "bg-emerald-50 text-emerald-700" },
];

export function SystemMockup() {
  return (
    <div className="relative mx-auto w-full max-w-2xl">
      <div
        className="absolute -inset-4 rounded-3xl bg-gradient-to-tr from-[#2563EB]/20 via-[#EAF2FF]/60 to-[#FF914D]/25 blur-2xl"
        aria-hidden="true"
      />
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xl shadow-blue-950/10">
        {/* Browser chrome */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-[#F5F7FA] px-4 py-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </div>
          <div className="rounded-md bg-white px-3 py-1 text-[11px] font-medium text-[#64748B] shadow-xs">
            app.agendai.com.br/agenda
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Online
          </span>
        </div>

        {/* Mockup body */}
        <div className="p-5 sm:p-6">
          {/* KPI strip */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-slate-100 bg-[#F5F7FA] p-3">
              <div className="flex items-center justify-between text-xs text-[#64748B]">
                <span>Hoje</span>
                <CalendarCheck2 className="h-4 w-4 text-[#2563EB]" />
              </div>
              <p className="mt-1.5 text-xl font-extrabold text-[#142B4F]">18</p>
              <p className="text-[11px] text-emerald-600 font-medium">94% confirmados</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-[#F5F7FA] p-3">
              <div className="flex items-center justify-between text-xs text-[#64748B]">
                <span>Receita mês</span>
                <TrendingUp className="h-4 w-4 text-[#FF914D]" />
              </div>
              <p className="mt-1.5 text-xl font-extrabold text-[#142B4F]">R$ 24,8k</p>
              <p className="text-[11px] text-[#2563EB] font-medium">Fluxo atualizado</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-[#F5F7FA] p-3">
              <div className="flex items-center justify-between text-xs text-[#64748B]">
                <span>Ocupação</span>
                <Users className="h-4 w-4 text-[#142B4F]" />
              </div>
              <p className="mt-1.5 text-xl font-extrabold text-[#142B4F]">89%</p>
              <p className="text-[11px] text-[#64748B] font-medium">3 profissionais</p>
            </div>
          </div>

          {/* Schedule preview */}
          <div className="mt-5 rounded-xl border border-slate-200/80 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#2563EB]" />
                <span className="text-sm font-bold text-[#142B4F]">
                  Agenda do dia
                </span>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#EAF2FF] px-2.5 py-0.5 text-[11px] font-semibold text-[#2563EB]">
                <MessageCircle className="h-3 w-3" />
                Lembrete WhatsApp pronto
              </span>
            </div>

            <div className="space-y-2">
              {SAMPLE_SLOTS.map((slot) => (
                <div
                  key={slot.time}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-[#F5F7FA]/70 px-3 py-2.5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="rounded-md bg-white px-2 py-1 text-xs font-bold text-[#142B4F] shadow-xs">
                      {slot.time}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-[#142B4F]">
                        {slot.title}
                      </p>
                      <p className="truncate text-[11px] text-[#64748B]">
                        {slot.pro}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${slot.tone}`}
                  >
                    {slot.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom confirmation bar */}
          <div className="mt-4 flex items-center justify-between rounded-xl bg-[#142B4F] px-4 py-3 text-white">
            <div className="flex items-center gap-2 text-xs">
              <CheckCircle2 className="h-4 w-4 text-[#FF914D]" />
              <span>Agendamento online 24h sem conflito de horários</span>
            </div>
            <span className="hidden text-[11px] font-semibold text-[#EAF2FF] sm:inline">
              Multi-tenant • LGPD
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

