"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Award,
  CheckCircle2,
  Clock,
  Loader2,
  Percent,
  Plus,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import {
  createCommissionAction,
  createGoalAction,
  createTimeEntryAction,
  payCommissionAction,
} from "@/modules/team/actions";
import {
  calculateCommissionCents,
  summarizeCommissions,
} from "@/modules/team/calculations";
import { formatCurrencyBRL, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";

export interface CommissionRow {
  id: string;
  professionalId: string;
  professionalName: string;
  source: "service" | "product_sale" | "goal_bonus" | "manual";
  calcType: "percentage" | "fixed";
  baseAmountCents: number;
  rateBps: number;
  commissionAmountCents: number;
  status: "pending" | "paid" | "cancelled";
  referenceDate: string;
  description: string;
}

export interface TimeEntryRow {
  id: string;
  professionalId: string;
  professionalName: string;
  type: "work_hours" | "overtime" | "absence" | "day_off" | "vacation";
  entryDate: string;
  durationMinutes: number;
  notes: string | null;
}

export interface GoalRow {
  id: string;
  professionalId: string;
  professionalName: string;
  monthKey: string;
  targetRevenueCents: number;
  targetAppointments: number;
  bonusCents: number;
}

interface TeamCommissionsHubProps {
  commissions: CommissionRow[];
  timeEntries: TimeEntryRow[];
  goals: GoalRow[];
  professionals: { id: string; name: string; defaultCommissionBps: number }[];
  accounts: { id: string; name: string }[];
  canManageTeam: boolean;
  canPayFinancial: boolean;
}

const SOURCE_LABELS: Record<string, string> = {
  service: "Serviço",
  product_sale: "Venda de Produto",
  goal_bonus: "Bônus de Meta",
  manual: "Manual",
};

const TIME_TYPE_LABELS: Record<string, string> = {
  work_hours: "Horas trabalhadas",
  overtime: "Horas extras",
  absence: "Falta",
  day_off: "Folga",
  vacation: "Férias",
};

export function TeamCommissionsHub({
  commissions,
  timeEntries,
  goals,
  professionals,
  accounts,
  canManageTeam,
  canPayFinancial,
}: TeamCommissionsHubProps) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  const [tab, setTab] = useState<"commissions" | "hours" | "goals">("commissions");
  const [profFilter, setProfFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Commission modal
  const [commModalOpen, setCommModalOpen] = useState(false);
  const [savingComm, setSavingComm] = useState(false);
  const [commForm, setCommForm] = useState({
    professionalId: professionals[0]?.id ?? "",
    source: "service" as "service" | "product_sale" | "goal_bonus" | "manual",
    calcType: "percentage" as "percentage" | "fixed",
    baseAmountReais: 0,
    ratePercent: (professionals[0]?.defaultCommissionBps ?? 0) / 100,
    fixedAmountReais: 0,
    referenceDate: today,
    description: "",
  });

  // Pay commission modal
  const [payTarget, setPayTarget] = useState<CommissionRow | null>(null);
  const [payAccountId, setPayAccountId] = useState(accounts[0]?.id ?? "");
  const [payMethod, setPayMethod] = useState("pix");
  const [paying, setPaying] = useState(false);

  // Time entry modal
  const [timeModalOpen, setTimeModalOpen] = useState(false);
  const [savingTime, setSavingTime] = useState(false);
  const [timeForm, setTimeForm] = useState({
    professionalId: professionals[0]?.id ?? "",
    type: "work_hours" as "work_hours" | "overtime" | "absence" | "day_off" | "vacation",
    entryDate: today,
    hours: 8,
    notes: "",
  });

  // Goal modal
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);
  const [goalForm, setGoalForm] = useState({
    professionalId: professionals[0]?.id ?? "",
    monthKey: today.slice(0, 7),
    targetRevenueReais: 5000,
    targetAppointments: 40,
    bonusReais: 300,
  });

  const filteredCommissions = useMemo(() => {
    return commissions.filter((c) => {
      if (profFilter !== "all" && c.professionalId !== profFilter) return false;
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      return true;
    });
  }, [commissions, profFilter, statusFilter]);

  const summary = useMemo(
    () => summarizeCommissions(filteredCommissions),
    [filteredCommissions]
  );

  const previewCommissionCents = calculateCommissionCents({
    calcType: commForm.calcType,
    baseAmountCents: Math.round(commForm.baseAmountReais * 100),
    rateBps: Math.round(commForm.ratePercent * 100),
    fixedAmountCents: Math.round(commForm.fixedAmountReais * 100),
  });

  async function handleSaveCommission(e: React.FormEvent) {
    e.preventDefault();
    setSavingComm(true);
    const res = await createCommissionAction(commForm);
    setSavingComm(false);
    if (!res.success) {
      toast.error(res.error || "Erro ao lançar comissão.");
      return;
    }
    toast.success("Comissão registrada!");
    setCommModalOpen(false);
    setCommForm((p) => ({ ...p, description: "", baseAmountReais: 0, fixedAmountReais: 0 }));
    router.refresh();
  }

  async function handlePayCommission(e: React.FormEvent) {
    e.preventDefault();
    if (!payTarget) return;
    setPaying(true);
    const res = await payCommissionAction(payTarget.id, {
      accountId: payAccountId,
      paymentMethod: payMethod,
    });
    setPaying(false);
    if (!res.success) {
      toast.error(res.error || "Erro ao pagar comissão.");
      return;
    }
    toast.success("Comissão paga e despesa lançada automaticamente no Financeiro!");
    setPayTarget(null);
    router.refresh();
  }

  async function handleSaveTime(e: React.FormEvent) {
    e.preventDefault();
    setSavingTime(true);
    const res = await createTimeEntryAction(timeForm);
    setSavingTime(false);
    if (!res.success) {
      toast.error(res.error || "Erro ao salvar registro.");
      return;
    }
    toast.success("Registro de ponto/ausência salvo!");
    setTimeModalOpen(false);
    setTimeForm((p) => ({ ...p, notes: "" }));
    router.refresh();
  }

  async function handleSaveGoal(e: React.FormEvent) {
    e.preventDefault();
    setSavingGoal(true);
    const res = await createGoalAction(goalForm);
    setSavingGoal(false);
    if (!res.success) {
      toast.error(res.error || "Erro ao salvar meta.");
      return;
    }
    toast.success("Meta mensal salva!");
    setGoalModalOpen(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-[#64748B]">Comissões pendentes</p>
            <p className="mt-2 text-2xl font-extrabold text-[#C2410C]">
              {formatCurrencyBRL(summary.pendingCents)}
            </p>
            <p className="mt-1 text-xs text-[#64748B]">
              {summary.pendingCount} lançamentos aguardando pagamento
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-[#64748B]">Comissões pagas</p>
            <p className="mt-2 text-2xl font-extrabold text-emerald-700">
              {formatCurrencyBRL(summary.paidCents)}
            </p>
            <p className="mt-1 text-xs text-[#64748B]">Liquidadas no financeiro</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-[#64748B]">Total no filtro</p>
            <p className="mt-2 text-2xl font-extrabold text-[#142B4F]">
              {formatCurrencyBRL(summary.totalActiveCents)}
            </p>
            <p className="mt-1 text-xs text-[#64748B]">
              {professionals.length} profissionais cadastrados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs + Primary Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
          {(
            [
              ["commissions", "Comissões", Percent],
              ["hours", "Horas, Faltas e Folgas", Clock],
              ["goals", "Metas Mensais", Target],
            ] as const
          ).map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold cursor-pointer",
                tab === key
                  ? "bg-[#2563EB] text-white"
                  : "text-[#64748B] hover:text-[#142B4F]"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {canManageTeam && (
          <div className="flex gap-2">
            {tab === "commissions" && (
              <Button size="sm" onClick={() => setCommModalOpen(true)}>
                <Plus className="h-4 w-4" />
                Lançar comissão
              </Button>
            )}
            {tab === "hours" && (
              <Button size="sm" onClick={() => setTimeModalOpen(true)}>
                <Plus className="h-4 w-4" />
                Registrar horas / ausência
              </Button>
            )}
            {tab === "goals" && (
              <Button size="sm" onClick={() => setGoalModalOpen(true)}>
                <Plus className="h-4 w-4" />
                Nova meta
              </Button>
            )}
          </div>
        )}
      </div>

      {/* TAB 1: COMMISSIONS */}
      {tab === "commissions" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <select
              value={profFilter}
              onChange={(e) => setProfFilter(e.target.value)}
              className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-[#142B4F]"
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
            >
              <option value="all">Todos os status</option>
              <option value="pending">Pendentes</option>
              <option value="paid">Pagas</option>
            </select>
          </div>

          {filteredCommissions.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-sm text-[#64748B]">
                Nenhuma comissão registrada para este filtro.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2.5">
              {filteredCommissions.map((c) => (
                <Card key={c.id}>
                  <CardContent className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-sm text-[#142B4F]">
                          {c.professionalName}
                        </p>
                        <Badge variant={c.status === "paid" ? "success" : "orange"}>
                          {c.status === "paid" ? "Paga" : "Pendente"}
                        </Badge>
                        <Badge variant="outline">{SOURCE_LABELS[c.source]}</Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-[#64748B]">
                        {c.description} • Ref.:{" "}
                        {c.referenceDate.split("-").reverse().join("/")}
                        {c.calcType === "percentage"
                          ? ` (${(c.rateBps / 100).toFixed(1)}% sobre ${formatCurrencyBRL(c.baseAmountCents)})`
                          : " (Valor fixo)"}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-base font-extrabold text-[#142B4F]">
                        {formatCurrencyBRL(c.commissionAmountCents)}
                      </span>
                      {canPayFinancial && c.status === "pending" && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setPayTarget(c)}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Pagar
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: HOURS / ABSENCES / VACATIONS */}
      {tab === "hours" && (
        <div className="space-y-2.5">
          {timeEntries.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-sm text-[#64748B]">
                Nenhum registro de horas, extras, faltas, folgas ou férias.
              </CardContent>
            </Card>
          ) : (
            timeEntries.map((t) => (
              <Card key={t.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-[#142B4F]">
                        {t.professionalName}
                      </p>
                      <Badge
                        variant={
                          t.type === "absence"
                            ? "destructive"
                            : t.type === "overtime"
                              ? "orange"
                              : "default"
                        }
                      >
                        {TIME_TYPE_LABELS[t.type]}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-[#64748B]">
                      {t.entryDate.split("-").reverse().join("/")}
                      {t.notes ? ` • ${t.notes}` : ""}
                    </p>
                  </div>
                  {t.durationMinutes > 0 && (
                    <span className="text-sm font-bold text-[#2563EB]">
                      {(t.durationMinutes / 60).toFixed(1)}h
                    </span>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* TAB 3: GOALS */}
      {tab === "goals" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {goals.length === 0 ? (
            <Card className="border-dashed md:col-span-2 lg:col-span-3">
              <CardContent className="py-12 text-center text-sm text-[#64748B]">
                Nenhuma meta mensal configurada ainda.
              </CardContent>
            </Card>
          ) : (
            goals.map((g) => (
              <Card key={g.id}>
                <CardContent className="p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-[#142B4F]">{g.professionalName}</p>
                    <Badge>{g.monthKey}</Badge>
                  </div>
                  <div className="rounded-xl bg-[#F5F7FA] p-3 text-xs space-y-1">
                    <p>
                      Meta de faturamento:{" "}
                      <strong className="text-[#142B4F]">
                        {formatCurrencyBRL(g.targetRevenueCents)}
                      </strong>
                    </p>
                    <p>
                      Meta de atendimentos:{" "}
                      <strong className="text-[#142B4F]">{g.targetAppointments}</strong>
                    </p>
                    {g.bonusCents > 0 && (
                      <p className="flex items-center gap-1 text-emerald-700 font-semibold">
                        <Award className="h-3.5 w-3.5" />
                        Bônus ao atingir: {formatCurrencyBRL(g.bonusCents)}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* CREATE COMMISSION MODAL */}
      <Modal
        open={commModalOpen}
        onClose={() => setCommModalOpen(false)}
        title="Lançar comissão"
      >
        <form onSubmit={handleSaveCommission} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Profissional *</Label>
              <select
                value={commForm.professionalId}
                onChange={(e) => {
                  const p = professionals.find((x) => x.id === e.target.value);
                  setCommForm({
                    ...commForm,
                    professionalId: e.target.value,
                    ratePercent: p ? p.defaultCommissionBps / 100 : commForm.ratePercent,
                  });
                }}
                className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#142B4F]"
                required
              >
                {professionals.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Origem</Label>
              <select
                value={commForm.source}
                onChange={(e) =>
                  setCommForm({ ...commForm, source: e.target.value as typeof commForm.source })
                }
                className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#142B4F]"
              >
                {Object.entries(SOURCE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label>Cálculo</Label>
              <select
                value={commForm.calcType}
                onChange={(e) =>
                  setCommForm({ ...commForm, calcType: e.target.value as "percentage" | "fixed" })
                }
                className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#142B4F]"
              >
                <option value="percentage">Percentual (%)</option>
                <option value="fixed">Valor fixo (R$)</option>
              </select>
            </div>

            {commForm.calcType === "percentage" ? (
              <>
                <div className="space-y-1">
                  <Label>Valor base (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={commForm.baseAmountReais}
                    onChange={(e) =>
                      setCommForm({ ...commForm, baseAmountReais: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Percentual (%)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    value={commForm.ratePercent}
                    onChange={(e) =>
                      setCommForm({ ...commForm, ratePercent: Number(e.target.value) })
                    }
                  />
                </div>
              </>
            ) : (
              <div className="space-y-1 sm:col-span-2">
                <Label>Valor fixo da comissão (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={commForm.fixedAmountReais}
                  onChange={(e) =>
                    setCommForm({ ...commForm, fixedAmountReais: Number(e.target.value) })
                  }
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1 sm:col-span-2">
              <Label>Descrição *</Label>
              <Input
                placeholder="Ex.: Atendimentos semana 1, Bônus meta..."
                value={commForm.description}
                onChange={(e) => setCommForm({ ...commForm, description: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Data ref.</Label>
              <Input
                type="date"
                value={commForm.referenceDate}
                onChange={(e) => setCommForm({ ...commForm, referenceDate: e.target.value })}
              />
            </div>
          </div>

          <div className="rounded-xl bg-[#EAF2FF] px-4 py-3 text-xs font-semibold text-[#142B4F]">
            Valor calculado da comissão:{" "}
            <span className="text-base font-extrabold text-[#2563EB]">
              {formatCurrencyBRL(previewCommissionCents)}
            </span>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setCommModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={savingComm}>
              {savingComm && <Loader2 className="h-4 w-4 animate-spin" />}
              Lançar comissão
            </Button>
          </div>
        </form>
      </Modal>

      {/* PAY COMMISSION MODAL */}
      <Modal
        open={Boolean(payTarget)}
        onClose={() => setPayTarget(null)}
        title="Pagar comissão no Financeiro"
        description={
          payTarget
            ? `${payTarget.professionalName} — ${formatCurrencyBRL(payTarget.commissionAmountCents)}`
            : undefined
        }
      >
        <form onSubmit={handlePayCommission} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Conta de saída</Label>
              <select
                value={payAccountId}
                onChange={(e) => setPayAccountId(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#142B4F]"
                required
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Forma de pagamento</Label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#142B4F]"
              >
                <option value="pix">Pix</option>
                <option value="bank_transfer">Transferência</option>
                <option value="cash">Dinheiro</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setPayTarget(null)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={paying}>
              {paying && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirmar pagamento
            </Button>
          </div>
        </form>
      </Modal>

      {/* TIME ENTRY MODAL */}
      <Modal
        open={timeModalOpen}
        onClose={() => setTimeModalOpen(false)}
        title="Registrar horas, falta, folga ou férias"
      >
        <form onSubmit={handleSaveTime} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Profissional *</Label>
              <select
                value={timeForm.professionalId}
                onChange={(e) => setTimeForm({ ...timeForm, professionalId: e.target.value })}
                className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#142B4F]"
              >
                {professionals.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Tipo</Label>
              <select
                value={timeForm.type}
                onChange={(e) =>
                  setTimeForm({ ...timeForm, type: e.target.value as typeof timeForm.type })
                }
                className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#142B4F]"
              >
                {Object.entries(TIME_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Data *</Label>
              <Input
                type="date"
                value={timeForm.entryDate}
                onChange={(e) => setTimeForm({ ...timeForm, entryDate: e.target.value })}
                required
              />
            </div>
            {(timeForm.type === "work_hours" || timeForm.type === "overtime") && (
              <div className="space-y-1">
                <Label>Horas</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="24"
                  value={timeForm.hours}
                  onChange={(e) => setTimeForm({ ...timeForm, hours: Number(e.target.value) })}
                />
              </div>
            )}
          </div>

          <div className="space-y-1">
            <Label>Observação</Label>
            <Input
              value={timeForm.notes}
              onChange={(e) => setTimeForm({ ...timeForm, notes: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setTimeModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={savingTime}>
              {savingTime && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar registro
            </Button>
          </div>
        </form>
      </Modal>

      {/* GOAL MODAL */}
      <Modal
        open={goalModalOpen}
        onClose={() => setGoalModalOpen(false)}
        title="Definir meta mensal"
      >
        <form onSubmit={handleSaveGoal} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Profissional *</Label>
              <select
                value={goalForm.professionalId}
                onChange={(e) => setGoalForm({ ...goalForm, professionalId: e.target.value })}
                className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#142B4F]"
              >
                {professionals.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Mês (AAAA-MM)</Label>
              <Input
                type="month"
                value={goalForm.monthKey}
                onChange={(e) => setGoalForm({ ...goalForm, monthKey: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Faturamento (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={goalForm.targetRevenueReais}
                onChange={(e) =>
                  setGoalForm({ ...goalForm, targetRevenueReais: Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Atendimentos</Label>
              <Input
                type="number"
                min="0"
                value={goalForm.targetAppointments}
                onChange={(e) =>
                  setGoalForm({ ...goalForm, targetAppointments: Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Bônus (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={goalForm.bonusReais}
                onChange={(e) =>
                  setGoalForm({ ...goalForm, bonusReais: Number(e.target.value) })
                }
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setGoalModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={savingGoal}>
              {savingGoal && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar meta
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

