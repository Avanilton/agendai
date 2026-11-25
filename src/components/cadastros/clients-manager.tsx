"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Cake,
  Loader2,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  createClientAction,
  deleteClientAction,
  updateClientAction,
} from "@/modules/clients/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";

export interface ClientRow {
  id: string;
  name: string;
  cpf: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  birthDate: string | null;
  address: string | null;
  notes: string | null;
  tags: string[];
  origin: string | null;
  status: "active" | "inactive" | "blocked";
  contactPreferences: { whatsapp?: boolean; email?: boolean; sms?: boolean };
  lgpdConsentAt: Date | string | null;
}

interface ClientsManagerProps {
  initialClients: ClientRow[];
  canWrite: boolean;
  canDelete: boolean;
}

const EMPTY_FORM = {
  name: "",
  cpf: "",
  phone: "",
  whatsapp: "",
  email: "",
  birthDate: "",
  address: "",
  notes: "",
  tagsText: "",
  origin: "",
  status: "active" as "active" | "inactive" | "blocked",
  whatsappOptIn: true,
  emailOptIn: true,
  lgpdConsent: true,
};

export function ClientsManager({
  initialClients,
  canWrite,
  canDelete,
}: ClientsManagerProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "blocked">("all");
  const [birthMonthOnly, setBirthMonthOnly] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const currentMonth = String(new Date().getMonth() + 1).padStart(2, "0");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return initialClients.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (birthMonthOnly && (!c.birthDate || c.birthDate.slice(5, 7) !== currentMonth)) {
        return false;
      }
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.email?.toLowerCase().includes(q) ?? false) ||
        (c.phone?.toLowerCase().includes(q) ?? false) ||
        (c.cpf?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [initialClients, search, statusFilter, birthMonthOnly, currentMonth]);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(client: ClientRow) {
    setEditingId(client.id);
    setForm({
      name: client.name,
      cpf: client.cpf ?? "",
      phone: client.phone ?? "",
      whatsapp: client.whatsapp ?? "",
      email: client.email ?? "",
      birthDate: client.birthDate ?? "",
      address: client.address ?? "",
      notes: client.notes ?? "",
      tagsText: (client.tags ?? []).join(", "),
      origin: client.origin ?? "",
      status: client.status,
      whatsappOptIn: client.contactPreferences?.whatsapp ?? true,
      emailOptIn: client.contactPreferences?.email ?? true,
      lgpdConsent: Boolean(client.lgpdConsentAt),
    });
    setModalOpen(true);
  }

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

    const result = editingId
      ? await updateClientAction(editingId, payload)
      : await createClientAction(payload);

    setSaving(false);
    if (!result.success) {
      toast.error(result.error || "Erro ao salvar cliente.");
      return;
    }

    toast.success(editingId ? "Cliente atualizado!" : "Cliente cadastrado!");
    setModalOpen(false);
    router.refresh();
  }

  async function handleDelete(client: ClientRow) {
    if (!window.confirm(`Deseja remover o cliente "${client.name}"?`)) return;
    const result = await deleteClientAction(client.id);
    if (!result.success) {
      toast.error(result.error || "Erro ao remover cliente.");
      return;
    }
    toast.success("Cliente removido.");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por nome, telefone, e-mail ou CPF..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#142B4F]"
            aria-label="Filtrar por status"
          >
            <option value="all">Todos os status</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
            <option value="blocked">Bloqueados</option>
          </select>

          <Button
            type="button"
            variant={birthMonthOnly ? "accent" : "outline"}
            onClick={() => setBirthMonthOnly((prev) => !prev)}
          >
            <Cake className="h-4 w-4" />
            Aniversariantes do mês
          </Button>
        </div>

        {canWrite && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Novo cliente
          </Button>
        )}
      </div>

      {/* Empty state */}
      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EAF2FF] text-[#2563EB]">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="mt-3 text-base font-bold text-[#142B4F]">
              Nenhum cliente encontrado
            </h3>
            <p className="mt-1 text-sm text-[#64748B]">
              Cadastre seu primeiro cliente ou ajuste os filtros de busca.
            </p>
            {canWrite && (
              <Button className="mt-4" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Cadastrar cliente
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filtered.map((client) => (
              <Card key={client.id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-[#142B4F]">{client.name}</p>
                      <p className="text-xs text-[#64748B]">
                        {client.phone || client.whatsapp || "Sem telefone"}
                      </p>
                    </div>
                    <Badge
                      variant={
                        client.status === "active"
                          ? "success"
                          : client.status === "blocked"
                            ? "destructive"
                            : "outline"
                      }
                    >
                      {client.status === "active"
                        ? "Ativo"
                        : client.status === "blocked"
                          ? "Bloqueado"
                          : "Inativo"}
                    </Badge>
                  </div>
                  {client.email && (
                    <p className="text-xs text-[#64748B] truncate">{client.email}</p>
                  )}
                  <div className="flex items-center justify-end gap-2 pt-2">
                    {canWrite && (
                      <Button size="sm" variant="outline" onClick={() => openEdit(client)}>
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </Button>
                    )}
                    {canDelete && (
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(client)}>
                        <Trash2 className="h-3.5 w-3.5 text-red-600" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop table */}
          <Card className="hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-[#F5F7FA] text-xs uppercase text-[#64748B]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Cliente</th>
                    <th className="px-4 py-3 font-semibold">Contato</th>
                    <th className="px-4 py-3 font-semibold">Origem / Tags</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 text-right font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((client) => (
                    <tr key={client.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-[#142B4F]">{client.name}</p>
                        {client.birthDate && (
                          <p className="text-xs text-[#64748B]">
                            Nasc.: {client.birthDate.split("-").reverse().join("/")}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="flex items-center gap-1.5 text-xs text-[#142B4F]">
                          <Phone className="h-3.5 w-3.5 text-[#2563EB]" />
                          {client.whatsapp || client.phone || "—"}
                        </p>
                        <p className="text-xs text-[#64748B]">{client.email || "—"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {client.origin && <Badge variant="outline">{client.origin}</Badge>}
                          {(client.tags ?? []).slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="default">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            client.status === "active"
                              ? "success"
                              : client.status === "blocked"
                                ? "destructive"
                                : "outline"
                          }
                        >
                          {client.status === "active"
                            ? "Ativo"
                            : client.status === "blocked"
                              ? "Bloqueado"
                              : "Inativo"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          {canWrite && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEdit(client)}
                              aria-label={`Editar ${client.name}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(client)}
                              aria-label={`Remover ${client.name}`}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Editar cliente" : "Novo cliente"}
        description="Cadastro completo com proteção de duplicidade e consentimento LGPD."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="c-name">Nome completo *</Label>
              <Input
                id="c-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-cpf">CPF (opcional)</Label>
              <Input
                id="c-cpf"
                placeholder="000.000.000-00"
                value={form.cpf}
                onChange={(e) => setForm({ ...form, cpf: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="c-phone">Telefone</Label>
              <Input
                id="c-phone"
                placeholder="(11) 99999-9999"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-whatsapp">WhatsApp</Label>
              <Input
                id="c-whatsapp"
                placeholder="(11) 99999-9999"
                value={form.whatsapp}
                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-birth">Data de nascimento</Label>
              <Input
                id="c-birth"
                type="date"
                value={form.birthDate}
                onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="c-email">E-mail</Label>
              <Input
                id="c-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-origin">Origem do cliente</Label>
              <Input
                id="c-origin"
                placeholder="Instagram, Indicação, Google..."
                value={form.origin}
                onChange={(e) => setForm({ ...form, origin: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="c-tags">Tags (separadas por vírgula)</Label>
              <Input
                id="c-tags"
                placeholder="VIP, Recorrente"
                value={form.tagsText}
                onChange={(e) => setForm({ ...form, tagsText: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-status">Status</Label>
              <select
                id="c-status"
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
            <Label htmlFor="c-address">Endereço</Label>
            <Input
              id="c-address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="c-notes">Observações</Label>
            <textarea
              id="c-notes"
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
                onChange={(e) => setForm({ ...form, whatsappOptIn: e.target.checked })}
              />
              Aceita lembretes por WhatsApp
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.emailOptIn}
                onChange={(e) => setForm({ ...form, emailOptIn: e.target.checked })}
              />
              Aceita e-mails
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.lgpdConsent}
                onChange={(e) => setForm({ ...form, lgpdConsent: e.target.checked })}
              />
              Consentimento LGPD registrado
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingId ? "Salvar alterações" : "Cadastrar cliente"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

