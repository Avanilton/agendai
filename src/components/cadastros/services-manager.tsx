"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Loader2, Pencil, Plus, Scissors, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  createServiceAction,
  deleteServiceAction,
  updateServiceAction,
} from "@/modules/services/actions";
import { formatCurrencyBRL } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";

export interface ServiceRow {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  priceCents: number;
  durationMinutes: number;
  bufferMinutes: number;
  commissionBps: number;
  color: string;
  status: "active" | "inactive";
  professionalIds: string[];
}

interface ServicesManagerProps {
  initialServices: ServiceRow[];
  professionals: { id: string; name: string }[];
  canWrite: boolean;
}

const EMPTY_FORM = {
  name: "",
  category: "",
  description: "",
  priceReais: 0,
  durationMinutes: 30,
  bufferMinutes: 0,
  commissionPercent: 0,
  color: "#2563EB",
  status: "active" as "active" | "inactive",
  professionalIds: [] as string[],
};

export function ServicesManager({
  initialServices,
  professionals,
  canWrite,
}: ServicesManagerProps) {
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

  function openEdit(svc: ServiceRow) {
    setEditingId(svc.id);
    setForm({
      name: svc.name,
      category: svc.category ?? "",
      description: svc.description ?? "",
      priceReais: svc.priceCents / 100,
      durationMinutes: svc.durationMinutes,
      bufferMinutes: svc.bufferMinutes,
      commissionPercent: svc.commissionBps / 100,
      color: svc.color,
      status: svc.status,
      professionalIds: svc.professionalIds,
    });
    setModalOpen(true);
  }

  function toggleProfessional(id: string) {
    setForm((prev) => ({
      ...prev,
      professionalIds: prev.professionalIds.includes(id)
        ? prev.professionalIds.filter((pid) => pid !== id)
        : [...prev.professionalIds, id],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const result = editingId
      ? await updateServiceAction(editingId, form)
      : await createServiceAction(form);
    setSaving(false);

    if (!result.success) {
      toast.error(result.error || "Erro ao salvar serviço.");
      return;
    }

    toast.success(editingId ? "Serviço atualizado!" : "Serviço cadastrado!");
    setModalOpen(false);
    router.refresh();
  }

  async function handleDelete(svc: ServiceRow) {
    if (!window.confirm(`Deseja remover o serviço "${svc.name}"?`)) return;
    const result = await deleteServiceAction(svc.id);
    if (!result.success) {
      toast.error(result.error || "Erro ao remover serviço.");
      return;
    }
    toast.success("Serviço removido.");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        {canWrite && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Novo serviço
          </Button>
        )}
      </div>

      {initialServices.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EAF2FF] text-[#2563EB]">
              <Scissors className="h-6 w-6" />
            </div>
            <h3 className="mt-3 text-base font-bold text-[#142B4F]">
              Nenhum serviço cadastrado
            </h3>
            <p className="mt-1 text-sm text-[#64748B]">
              Cadastre os serviços oferecidos com preço, duração e profissionais habilitados.
            </p>
            {canWrite && (
              <Button className="mt-4" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Cadastrar serviço
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {initialServices.map((svc) => (
            <Card key={svc.id}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="h-3.5 w-3.5 shrink-0 rounded-full"
                      style={{ backgroundColor: svc.color }}
                    />
                    <div className="min-w-0">
                      <p className="truncate font-bold text-[#142B4F]">{svc.name}</p>
                      {svc.category && (
                        <p className="text-xs text-[#64748B]">{svc.category}</p>
                      )}
                    </div>
                  </div>
                  <Badge variant={svc.status === "active" ? "success" : "outline"}>
                    {svc.status === "active" ? "Ativo" : "Inativo"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-[#F5F7FA] px-3.5 py-2.5">
                  <span className="text-base font-extrabold text-[#142B4F]">
                    {formatCurrencyBRL(svc.priceCents)}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-[#64748B]">
                    <Clock className="h-3.5 w-3.5 text-[#2563EB]" />
                    {svc.durationMinutes} min
                    {svc.bufferMinutes > 0 ? ` (+${svc.bufferMinutes}m)` : ""}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-[#64748B]">
                  <span>
                    {svc.professionalIds.length}{" "}
                    {svc.professionalIds.length === 1
                      ? "profissional habilitado"
                      : "profissionais habilitados"}
                  </span>
                  <span>Comissão: {(svc.commissionBps / 100).toFixed(1)}%</span>
                </div>

                {canWrite && (
                  <div className="flex justify-end gap-1 pt-1">
                    <Button size="sm" variant="outline" onClick={() => openEdit(svc)}>
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(svc)}>
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
        title={editingId ? "Editar serviço" : "Novo serviço"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="s-name">Nome do serviço *</Label>
              <Input
                id="s-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-cat">Categoria</Label>
              <Input
                id="s-cat"
                placeholder="Consulta, Estética, Cabelo..."
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="s-price">Preço (R$)</Label>
              <Input
                id="s-price"
                type="number"
                step="0.01"
                min="0"
                value={form.priceReais}
                onChange={(e) => setForm({ ...form, priceReais: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-dur">Duração (min)</Label>
              <Input
                id="s-dur"
                type="number"
                min="5"
                value={form.durationMinutes}
                onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-buf">Intervalo (min)</Label>
              <Input
                id="s-buf"
                type="number"
                min="0"
                value={form.bufferMinutes}
                onChange={(e) => setForm({ ...form, bufferMinutes: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-comm">Comissão (%)</Label>
              <Input
                id="s-comm"
                type="number"
                step="0.5"
                min="0"
                max="100"
                value={form.commissionPercent}
                onChange={(e) => setForm({ ...form, commissionPercent: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="s-status">Status</Label>
              <select
                id="s-status"
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as "active" | "inactive" })
                }
                className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#142B4F]"
              >
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-color">Cor na agenda</Label>
              <Input
                id="s-color"
                type="color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="h-10 p-1"
              />
            </div>
          </div>

          {professionals.length > 0 && (
            <div className="space-y-2">
              <Label>Profissionais habilitados</Label>
              <div className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-[#F5F7FA] p-3 sm:grid-cols-2">
                {professionals.map((pro) => (
                  <label
                    key={pro.id}
                    className="flex items-center gap-2 text-xs font-medium text-[#142B4F] cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={form.professionalIds.includes(pro.id)}
                      onChange={() => toggleProfessional(pro.id)}
                    />
                    <span>{pro.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="s-desc">Descrição</Label>
            <textarea
              id="s-desc"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-[#142B4F]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingId ? "Salvar alterações" : "Cadastrar serviço"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

