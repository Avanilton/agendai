"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarOff, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  createScheduleBlockAction,
  deleteScheduleBlockAction,
  saveAvailabilityAction,
} from "@/modules/agenda/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const DAY_LABELS = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

interface RuleItem {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  breakStartTime: string;
  breakEndTime: string;
  isActive: boolean;
}

interface AvailabilityManagerProps {
  initialRules: RuleItem[];
  initialBlocks: {
    id: string;
    professionalName: string | null;
    type: "block" | "vacation" | "holiday" | "break";
    title: string;
    startsAtIso: string;
    endsAtIso: string;
  }[];
  professionals: { id: string; name: string }[];
  canWrite: boolean;
}

export function AvailabilityManager({
  initialRules,
  initialBlocks,
  professionals,
  canWrite,
}: AvailabilityManagerProps) {
  const router = useRouter();
  const [rules, setRules] = useState<RuleItem[]>(initialRules);
  const [savingRules, setSavingRules] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const [blockForm, setBlockForm] = useState({
    professionalId: "",
    type: "block" as "block" | "vacation" | "holiday" | "break",
    title: "",
    startDate: today,
    startTime: "08:00",
    endDate: today,
    endTime: "18:00",
    notes: "",
  });
  const [savingBlock, setSavingBlock] = useState(false);

  function updateRule(dayOfWeek: number, patch: Partial<RuleItem>) {
    setRules((prev) =>
      prev.map((r) => (r.dayOfWeek === dayOfWeek ? { ...r, ...patch } : r))
    );
  }

  async function handleSaveRules(e: React.FormEvent) {
    e.preventDefault();
    setSavingRules(true);
    const result = await saveAvailabilityAction({
      professionalId: "",
      rules,
    });
    setSavingRules(false);

    if (!result.success) {
      toast.error(result.error || "Erro ao salvar horários.");
      return;
    }
    toast.success("Horários de funcionamento salvos!");
    router.refresh();
  }

  async function handleCreateBlock(e: React.FormEvent) {
    e.preventDefault();
    setSavingBlock(true);
    const result = await createScheduleBlockAction(blockForm);
    setSavingBlock(false);

    if (!result.success) {
      toast.error(result.error || "Erro ao criar bloqueio.");
      return;
    }

    toast.success("Bloqueio registrado na agenda!");
    setBlockForm({ ...blockForm, title: "", notes: "" });
    router.refresh();
  }

  async function handleDeleteBlock(id: string) {
    const result = await deleteScheduleBlockAction(id);
    if (!result.success) {
      toast.error(result.error || "Erro ao remover bloqueio.");
      return;
    }
    toast.success("Bloqueio removido.");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/app/agenda">
            <ArrowLeft className="h-4 w-4" />
            Voltar para a Agenda
          </Link>
        </Button>
      </div>

      {/* Weekly Hours */}
      <Card>
        <CardHeader>
          <CardTitle>Horário de Funcionamento Padrão</CardTitle>
          <CardDescription>
            Configure os dias de atendimento, expediente e intervalo padrão da empresa.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveRules} className="space-y-3">
            {rules.map((rule) => (
              <div
                key={rule.dayOfWeek}
                className="grid grid-cols-1 items-center gap-3 rounded-xl border border-slate-200 bg-[#F5F7FA]/60 p-3 sm:grid-cols-12"
              >
                <label className="flex items-center gap-2 text-sm font-semibold text-[#142B4F] sm:col-span-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rule.isActive}
                    disabled={!canWrite}
                    onChange={(e) =>
                      updateRule(rule.dayOfWeek, { isActive: e.target.checked })
                    }
                  />
                  {DAY_LABELS[rule.dayOfWeek]}
                </label>

                <div className="grid grid-cols-2 gap-2 sm:col-span-4">
                  <Input
                    type="time"
                    value={rule.startTime}
                    disabled={!canWrite || !rule.isActive}
                    onChange={(e) =>
                      updateRule(rule.dayOfWeek, { startTime: e.target.value })
                    }
                  />
                  <Input
                    type="time"
                    value={rule.endTime}
                    disabled={!canWrite || !rule.isActive}
                    onChange={(e) =>
                      updateRule(rule.dayOfWeek, { endTime: e.target.value })
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 sm:col-span-5">
                  <Input
                    type="time"
                    placeholder="Início pausa"
                    value={rule.breakStartTime}
                    disabled={!canWrite || !rule.isActive}
                    onChange={(e) =>
                      updateRule(rule.dayOfWeek, { breakStartTime: e.target.value })
                    }
                  />
                  <Input
                    type="time"
                    placeholder="Fim pausa"
                    value={rule.breakEndTime}
                    disabled={!canWrite || !rule.isActive}
                    onChange={(e) =>
                      updateRule(rule.dayOfWeek, { breakEndTime: e.target.value })
                    }
                  />
                </div>
              </div>
            ))}

            {canWrite && (
              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={savingRules}>
                  {savingRules ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Salvar horários
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Schedule Blocks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarOff className="h-5 w-5 text-[#FF914D]" />
            Bloqueios, Férias e Feriados
          </CardTitle>
          <CardDescription>
            Impede automaticamente novos agendamentos no período bloqueado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {canWrite && (
            <form onSubmit={handleCreateBlock} className="space-y-4 rounded-xl bg-[#F5F7FA] p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label htmlFor="b-title">Título *</Label>
                  <Input
                    id="b-title"
                    placeholder="Ex.: Feriado, Férias, Reunião"
                    value={blockForm.title}
                    onChange={(e) =>
                      setBlockForm({ ...blockForm, title: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="b-type">Tipo</Label>
                  <select
                    id="b-type"
                    value={blockForm.type}
                    onChange={(e) =>
                      setBlockForm({
                        ...blockForm,
                        type: e.target.value as typeof blockForm.type,
                      })
                    }
                    className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#142B4F]"
                  >
                    <option value="block">Bloqueio de horário</option>
                    <option value="vacation">Férias / Folga</option>
                    <option value="holiday">Feriado</option>
                    <option value="break">Intervalo especial</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="b-prof">Abrangência</Label>
                  <select
                    id="b-prof"
                    value={blockForm.professionalId}
                    onChange={(e) =>
                      setBlockForm({ ...blockForm, professionalId: e.target.value })
                    }
                    className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#142B4F]"
                  >
                    <option value="">Toda a empresa</option>
                    {professionals.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Input
                  type="date"
                  value={blockForm.startDate}
                  onChange={(e) =>
                    setBlockForm({ ...blockForm, startDate: e.target.value })
                  }
                />
                <Input
                  type="time"
                  value={blockForm.startTime}
                  onChange={(e) =>
                    setBlockForm({ ...blockForm, startTime: e.target.value })
                  }
                />
                <Input
                  type="date"
                  value={blockForm.endDate}
                  onChange={(e) =>
                    setBlockForm({ ...blockForm, endDate: e.target.value })
                  }
                />
                <Input
                  type="time"
                  value={blockForm.endTime}
                  onChange={(e) =>
                    setBlockForm({ ...blockForm, endTime: e.target.value })
                  }
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit" size="sm" disabled={savingBlock}>
                  {savingBlock ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Adicionar bloqueio
                </Button>
              </div>
            </form>
          )}

          {initialBlocks.length === 0 ? (
            <p className="text-center text-sm text-[#64748B] py-4">
              Nenhum bloqueio de agenda cadastrado.
            </p>
          ) : (
            <div className="space-y-2">
              {initialBlocks.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-[#142B4F]">
                        {b.title}
                      </span>
                      <Badge variant="orange">
                        {b.professionalName ?? "Toda empresa"}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-[#64748B]">
                      {new Date(b.startsAtIso).toLocaleString("pt-BR")} até{" "}
                      {new Date(b.endsAtIso).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  {canWrite && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteBlock(b.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

