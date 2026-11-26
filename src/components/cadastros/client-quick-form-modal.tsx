"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  createClientAction,
  updateClientAction,
} from "@/modules/clients/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";

export interface ClientFormInitialValues {
  id?: string | null;
  name?: string;
  cpf?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  birthDate?: string | null;
  address?: string | null;
  notes?: string | null;
  tags?: string[];
  origin?: string | null;
  status?: "active" | "inactive" | "blocked";
  whatsappOptIn?: boolean;
  emailOptIn?: boolean;
  lgpdConsent?: boolean;
}

interface ClientQuickFormModalProps {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  title?: string;
  description?: string;
  initialValues?: ClientFormInitialValues;
  onSaved?: (savedClient: { id: string; name: string }) => void;
}

function buildFormState(initial?: ClientFormInitialValues) {
  return {
    name: initial?.name ?? "",
    cpf: initial?.cpf ?? "",
    phone: initial?.phone ?? "",
    whatsapp: initial?.whatsapp ?? initial?.phone ?? "",
    email: initial?.email ?? "",
    birthDate: initial?.birthDate ?? "",
    address: initial?.address ?? "",
    notes: initial?.notes ?? "",
    tagsText: (initial?.tags ?? []).join(", "),
    origin: initial?.origin ?? "",
    status: (initial?.status ?? "active") as "active" | "inactive" | "blocked",
    whatsappOptIn: initial?.whatsappOptIn ?? true,
    emailOptIn: initial?.emailOptIn ?? true,
    lgpdConsent: initial?.lgpdConsent ?? true,
  };
}

export function ClientQuickFormModal(props: ClientQuickFormModalProps) {
  if (!props.open) return null;
  const modalKey = `${props.mode}-${props.initialValues?.id ?? "new"}-${props.initialValues?.name ?? ""}`;
  return <ClientQuickFormModalInner key={modalKey} {...props} />;
}

function ClientQuickFormModalInner({
  open,
  onClose,
  mode,
  title,
  description,
  initialValues,
  onSaved,
}: ClientQuickFormModalProps) {
  const [form, setForm] = useState(() => buildFormState(initialValues));
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const payload = {
      name: form.name,
      cpf: form.cpf,
      phone: form.phone,
      whatsapp: form.whatsapp,
      email: form.email,
      birthDate: form.birthDate,
      address: form.address,
      notes: form.notes,
      tags: form.tagsText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      origin: form.origin,
      status: form.status,
      whatsappOptIn: form.whatsappOptIn,
      emailOptIn: form.emailOptIn,
      lgpdConsent: form.lgpdConsent,
    };

    const result =
      mode === "edit" && initialValues?.id
        ? await updateClientAction(initialValues.id, payload)
        : await createClientAction(payload);

    setSaving(false);

    if (!result.success) {
      toast.error(result.error || "Erro ao salvar cliente.");
      return;
    }

    toast.success(
      mode === "edit" ? "Cadastro do cliente atualizado!" : "Cliente cadastrado com sucesso!"
    );

    const savedId =
      mode === "edit"
        ? initialValues?.id ?? ""
        : (result as { success: true; data?: { id: string } }).data?.id ?? "";

    onSaved?.({ id: savedId, name: form.name });
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title ?? (mode === "edit" ? "Editar cadastro do cliente" : "Cadastrar novo cliente")}
      description={
        description ??
        "Cadastro completo com proteção de duplicidade e consentimento LGPD."
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="qf-c-name">Nome completo *</Label>
            <Input
              id="qf-c-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qf-c-cpf">CPF (opcional)</Label>
            <Input
              id="qf-c-cpf"
              placeholder="000.000.000-00"
              value={form.cpf}
              onChange={(e) => setForm({ ...form, cpf: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="qf-c-phone">Telefone</Label>
            <Input
              id="qf-c-phone"
              placeholder="(11) 99999-9999"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qf-c-whatsapp">WhatsApp</Label>
            <Input
              id="qf-c-whatsapp"
              placeholder="(11) 99999-9999"
              value={form.whatsapp}
              onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qf-c-birth">Data de nascimento</Label>
            <Input
              id="qf-c-birth"
              type="date"
              value={form.birthDate}
              onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="qf-c-email">E-mail</Label>
            <Input
              id="qf-c-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qf-c-origin">Origem do cliente</Label>
            <Input
              id="qf-c-origin"
              placeholder="Instagram, Indicação, Agendamento..."
              value={form.origin}
              onChange={(e) => setForm({ ...form, origin: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="qf-c-tags">Tags (separadas por vírgula)</Label>
            <Input
              id="qf-c-tags"
              placeholder="VIP, Recorrente"
              value={form.tagsText}
              onChange={(e) => setForm({ ...form, tagsText: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qf-c-status">Status</Label>
            <select
              id="qf-c-status"
              value={form.status}
              onChange={(e) =>
                setForm({
                  ...form,
                  status: e.target.value as "active" | "inactive" | "blocked",
                })
              }
              className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#142B4F]"
            >
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
              <option value="blocked">Bloqueado</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="qf-c-address">Endereço</Label>
          <Input
            id="qf-c-address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="qf-c-notes">Observações</Label>
          <textarea
            id="qf-c-notes"
            rows={2}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-[#142B4F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
          />
        </div>

        <div className="flex flex-wrap gap-4 rounded-xl bg-[#F5F7FA] p-3 text-xs text-[#142B4F]">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.whatsappOptIn}
              onChange={(e) =>
                setForm({ ...form, whatsappOptIn: e.target.checked })
              }
            />
            Aceita lembretes por WhatsApp
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.emailOptIn}
              onChange={(e) =>
                setForm({ ...form, emailOptIn: e.target.checked })
              }
            />
            Aceita e-mails
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.lgpdConsent}
              onChange={(e) =>
                setForm({ ...form, lgpdConsent: e.target.checked })
              }
            />
            Consentimento LGPD registrado
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "edit" ? "Salvar alterações" : "Cadastrar cliente"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

