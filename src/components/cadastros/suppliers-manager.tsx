"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, Trash2, Truck } from "lucide-react";
import { toast } from "sonner";
import {
  createSupplierAction,
  deleteSupplierAction,
  updateSupplierAction,
} from "@/modules/suppliers/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";

export interface SupplierRow {
  id: string;
  name: string;
  document: string | null;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  status: "active" | "inactive";
}

interface SuppliersManagerProps {
  initialSuppliers: SupplierRow[];
  canWrite: boolean;
}

const EMPTY_FORM = {
  name: "",
  document: "",
  contactName: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
  status: "active" as "active" | "inactive",
};

export function SuppliersManager({
  initialSuppliers,
  canWrite,
}: SuppliersManagerProps) {
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

  function openEdit(sup: SupplierRow) {
    setEditingId(sup.id);
    setForm({
      name: sup.name,
      document: sup.document ?? "",
      contactName: sup.contactName ?? "",
      phone: sup.phone ?? "",
      email: sup.email ?? "",
      address: sup.address ?? "",
      notes: sup.notes ?? "",
      status: sup.status,
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const result = editingId
      ? await updateSupplierAction(editingId, form)
      : await createSupplierAction(form);
    setSaving(false);

    if (!result.success) {
      toast.error(result.error || "Erro ao salvar fornecedor.");
      return;
    }

    toast.success(editingId ? "Fornecedor atualizado!" : "Fornecedor cadastrado!");
    setModalOpen(false);
    router.refresh();
  }

  async function handleDelete(sup: SupplierRow) {
    if (!window.confirm(`Deseja remover o fornecedor "${sup.name}"?`)) return;
    const result = await deleteSupplierAction(sup.id);
    if (!result.success) {
      toast.error(result.error || "Erro ao remover fornecedor.");
      return;
    }
    toast.success("Fornecedor removido.");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        {canWrite && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Novo fornecedor
          </Button>
        )}
      </div>

      {initialSuppliers.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EAF2FF] text-[#2563EB]">
              <Truck className="h-6 w-6" />
            </div>
            <h3 className="mt-3 text-base font-bold text-[#142B4F]">
              Nenhum fornecedor cadastrado
            </h3>
            <p className="mt-1 text-sm text-[#64748B]">
              Cadastre fornecedores de produtos e insumos para vincular ao seu estoque.
            </p>
            {canWrite && (
              <Button className="mt-4" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Cadastrar fornecedor
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {initialSuppliers.map((sup) => (
            <Card key={sup.id}>
              <CardContent className="p-5 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-[#142B4F]">{sup.name}</p>
                    {sup.document && (
                      <p className="text-xs text-[#64748B]">{sup.document}</p>
                    )}
                  </div>
                  <Badge variant={sup.status === "active" ? "success" : "outline"}>
                    {sup.status === "active" ? "Ativo" : "Inativo"}
                  </Badge>
                </div>

                <div className="text-xs text-[#64748B] space-y-0.5">
                  {sup.contactName && <p>Contato: {sup.contactName}</p>}
                  {sup.phone && <p>Tel.: {sup.phone}</p>}
                  {sup.email && <p className="truncate">{sup.email}</p>}
                </div>

                {canWrite && (
                  <div className="flex justify-end gap-1 pt-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(sup)}>
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(sup)}>
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
        title={editingId ? "Editar fornecedor" : "Novo fornecedor"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sup-name">Nome / Razão social *</Label>
              <Input
                id="sup-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sup-doc">CNPJ / CPF</Label>
              <Input
                id="sup-doc"
                value={form.document}
                onChange={(e) => setForm({ ...form, document: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="sup-contact">Pessoa de contato</Label>
              <Input
                id="sup-contact"
                value={form.contactName}
                onChange={(e) => setForm({ ...form, contactName: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sup-phone">Telefone</Label>
              <Input
                id="sup-phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sup-email">E-mail</Label>
              <Input
                id="sup-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sup-addr">Endereço</Label>
              <Input
                id="sup-addr"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sup-status">Status</Label>
              <select
                id="sup-status"
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
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingId ? "Salvar alterações" : "Cadastrar fornecedor"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

