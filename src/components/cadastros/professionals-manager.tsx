"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  createProfessionalAction,
  deleteProfessionalAction,
  updateProfessionalAction,
} from "@/modules/professionals/actions";
import type { PlanUsageSummary } from "@/lib/plans/limits";
import { formatCurrencyBRL } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";

export interface ProfessionalRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  cpf: string | null;
  roleTitle: string | null;
  specialty: string | null;
  hiredAt: string | null;
  status: "active" | "inactive" | "vacation";
  defaultCommissionBps: number;
  salaryCents: number;
  remunerationType: "commission" | "fixed" | "hybrid";
  color: string;
}

interface ProfessionalsManagerProps {
  initialProfessionals: ProfessionalRow[];
  planUsage: PlanUsageSummary;
  canManage: boolean;
}

const EMPTY_FORM = {
  name: "",
  phone: "",
  email: "",
  cpf: "",
  roleTitle: "",
  specialty: "",
  hiredAt: "",
  status: "active" as "active" | "inactive" | "vacation",
  defaultCommissionPercent: 0,
  salaryReais: 0,
  remunerationType: "commission" as "commission" | "fixed" | "hybrid",
  color: "#2563EB",
};

export function ProfessionalsManager({
  initialProfessionals,
  planUsage,
  canManage,
}: ProfessionalsManagerProps) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(pro: ProfessionalRow) {
    setEditingId(pro.id);
    setForm({
      name: pro.name,
      phone: pro.phone ?? "",
      email: pro.email ?? "",
      cpf: pro.cpf ?? "",
      roleTitle: pro.roleTitle ?? "",
      specialty: pro.specialty ?? "",
      hiredAt: pro.hiredAt ?? "",
      status: pro.status,
      defaultCommissionPercent: pro.defaultCommissionBps / 100,
      salaryReais: pro.salaryCents / 100,
      remunerationType: pro.remunerationType,
      color: pro.color,
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const result = editingId
      ? await updateProfessionalAction(editingId, form)
      : await createProfessionalAction(form);
    setSaving(false);

    if (!result.success) {
      toast.error(result.error || "Erro ao salvar profissional.");
      return;
    }

    toast.success(editingId ? "Profissional atualizado!" : "Profissional cadastrado!");
    setModalOpen(false);
    router.refresh();
  }

  async function handleDelete(pro: ProfessionalRow) {
    if (!window.confirm(`Deseja remover o profissional "${pro.name}"?`)) return;
    const result = await deleteProfessionalAction(pro.id);
    if (!result.success) {
      toast.error(result.error || "Erro ao remover profissional.");
      return;
    }
    toast.success("Profissional removido.");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={planUsage.canAddProfessional ? "default" : "orange"}>
            Plano {planUsage.planName}: {planUsage.activeProfessionals}/
            {planUsage.maxProfessionals} ativos
          </Badge>
        </div>

        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Novo profissional
          </Button>
        )}
      </div>

      {initialProfessionals.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EAF2FF] text-[#2563EB]">
              <Briefcase className="h-6 w-6" />
            </div>
            <h3 className="mt-3 text-base font-bold text-[#142B4F]">
              Nenhum profissional cadastrado
            </h3>
            <p className="mt-1 text-sm text-[#64748B]">
              Cadastre os profissionais que realizam atendimentos na sua empresa.
            </p>
            {canManage && (
              <Button className="mt-4" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Cadastrar profissional
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {initialProfessionals.map((pro) => (
            <Card key={pro.id}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
                      style={{ backgroundColor: pro.color }}
                    >
                      {pro.name.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-bold text-[#142B4F]">{pro.name}</p>
                      <p className="truncate text-xs text-[#64748B]">
                        {pro.specialty || pro.roleTitle || "Profissional"}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      pro.status === "active"
                        ? "success"
                        : pro.status === "vacation"
                          ? "orange"
                          : "outline"
                    }
                  >
                    {pro.status === "active"
                      ? "Ativo"
                      : pro.status === "vacation"
                        ? "Férias"
                        : "Inativo"}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 rounded-xl bg-[#F5F7FA] p-3 text-xs">
                  <div>
                    <p className="text-[#64748B]">Comissão</p>
                    <p className="font-bold text-[#142B4F]">
                      {(pro.defaultCommissionBps / 100).toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-[#64748B]">Salário base</p>
                    <p className="font-bold text-[#142B4F]">
                      {formatCurrencyBRL(pro.salaryCents)}
                    </p>
                  </div>
                </div>

                {canManage && (
                  <div className="flex justify-end gap-1 pt-1">
                    <Button size="sm" variant="outline" onClick={() => openEdit(pro)}>
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(pro)}>
                      <Trash2 className="h-3.5 w-3.5 text-red-600" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Editar profissional" : "Novo profissional"}
        description="O limite de profissionais ativos respeita o plano contratado pela empresa."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="p-name">Nome completo *</Label>
              <Input
                id="p-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-specialty">Especialidade</Label>
              <Input
                id="p-specialty"
                placeholder="Ex.: Dermatologia, Corte Masculino..."
                value={form.specialty}
                onChange={(e) => setForm({ ...form, specialty: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="p-role">Cargo</Label>
              <Input
                id="p-role"
                value={form.roleTitle}
                onChange={(e) => setForm({ ...form, roleTitle: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-phone">Telefone</Label>
              <Input
                id="p-phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-email">E-mail</Label>
              <Input
                id="p-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="p-rem">Remuneração</Label>
              <select
                id="p-rem"
                value={form.remunerationType}
                onChange={(e) =>
                  setForm({
                    ...form,
                    remunerationType: e.target.value as "commission" | "fixed" | "hybrid",
                  })
                }
                className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#142B4F]"
              >
                <option value="commission">Comissão</option>
                <option value="fixed">Salário fixo</option>
                <option value="hybrid">Híbrido (Fixo + Comissão)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-comm">Comissão padrão (%)</Label>
              <Input
                id="p-comm"
                type="number"
                step="0.5"
                min="0"
                max="100"
                value={form.defaultCommissionPercent}
                onChange={(e) =>
                  setForm({ ...form, defaultCommissionPercent: Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-salary">Salário base (R$)</Label>
              <Input
                id="p-salary"
                type="number"
                step="0.01"
                min="0"
                value={form.salaryReais}
                onChange={(e) => setForm({ ...form, salaryReais: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="p-status">Status</Label>
              <select
                id="p-status"
                value={form.status}
                onChange={(e) =>
                  setForm({
                    ...form,
                    status: e.target.value as "active" | "inactive" | "vacation",
                  })
                }
                className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#142B4F]"
              >
                <option value="active">Ativo</option>
                <option value="vacation">Férias</option>
                <option value="inactive">Inativo</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-hired">Data de contratação</Label>
              <Input
                id="p-hired"
                type="date"
                value={form.hiredAt}
                onChange={(e) => setForm({ ...form, hiredAt: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-color">Cor na agenda</Label>
              <Input
                id="p-color"
                type="color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="h-10 p-1"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingId ? "Salvar alterações" : "Cadastrar profissional"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

