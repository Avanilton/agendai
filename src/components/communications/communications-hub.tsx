"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  Cake,
  FileText,
  History,
  Loader2,
  Mail,
  MessageCircle,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  createTemplateAction,
  deleteTemplateAction,
  sendCommunicationAction,
  updateTemplateAction,
} from "@/modules/communications/actions";
import {
  buildWhatsAppUrl,
  renderTemplate,
  type MessageCategory,
  type MessageChannel,
} from "@/modules/communications/templates";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";

export interface TemplateRow {
  id: string;
  channel: MessageChannel;
  category: MessageCategory;
  name: string;
  subject: string | null;
  body: string;
  isActive: boolean;
}

export interface UpcomingReminderRow {
  appointmentId: string;
  clientId: string;
  clientName: string;
  clientPhone: string | null;
  clientEmail: string | null;
  professionalName: string;
  serviceNames: string;
  dateLabel: string;
  timeLabel: string;
  status: string;
}

export interface CommunicationLogRow {
  id: string;
  channel: MessageChannel;
  category: MessageCategory;
  recipient: string;
  subject: string | null;
  renderedBody: string;
  status: string;
  createdAtIso: string;
}

interface CommunicationsHubProps {
  organizationName: string;
  upcomingReminders: UpcomingReminderRow[];
  templates: TemplateRow[];
  logs: CommunicationLogRow[];
  canManage: boolean;
}

const CATEGORY_LABELS: Record<MessageCategory, string> = {
  confirmation: "Confirmação",
  reminder: "Lembrete",
  cancellation: "Cancelamento",
  reschedule: "Reagendamento",
  billing: "Cobrança",
  birthday: "Aniversário",
  budget: "Orçamento",
  custom: "Personalizado",
};

const EMPTY_TEMPLATE = {
  channel: "whatsapp" as MessageChannel,
  category: "reminder" as MessageCategory,
  name: "",
  subject: "",
  body: "",
  isActive: true,
};

export function CommunicationsHub({
  organizationName,
  upcomingReminders,
  templates,
  logs,
  canManage,
}: CommunicationsHubProps) {
  const router = useRouter();
  const [tab, setTab] = useState<"reminders" | "templates" | "history">("reminders");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_TEMPLATE);
  const [saving, setSaving] = useState(false);

  const defaultWaReminder =
    templates.find((t) => t.channel === "whatsapp" && t.category === "reminder" && t.isActive) ??
    templates.find((t) => t.channel === "whatsapp");

  const defaultEmailReminder =
    templates.find((t) => t.channel === "email" && t.category === "reminder" && t.isActive) ??
    templates.find((t) => t.channel === "email");

  async function handleSendWhatsApp(row: UpcomingReminderRow) {
    const body = renderTemplate(
      defaultWaReminder?.body ??
        "Olá, {{nome}}! Lembrando do seu agendamento em {{empresa}} no dia {{data}} às {{hora}} com {{profissional}}.",
      {
        nome: row.clientName,
        data: row.dateLabel,
        hora: row.timeLabel,
        profissional: row.professionalName,
        servico: row.serviceNames,
        empresa: organizationName,
      }
    );

    const url = buildWhatsAppUrl(row.clientPhone, body);
    if (!url) {
      toast.error("Cliente sem número de WhatsApp válido cadastrado.");
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");

    if (canManage) {
      await sendCommunicationAction({
        clientId: row.clientId,
        appointmentId: row.appointmentId,
        templateId: defaultWaReminder?.id ?? "",
        channel: "whatsapp",
        category: "reminder",
        recipient: row.clientPhone ?? "",
        renderedBody: body,
      });
      toast.success("WhatsApp aberto e lembrete registrado no histórico.");
      router.refresh();
    }
  }

  async function handleSendEmail(row: UpcomingReminderRow) {
    if (!row.clientEmail) {
      toast.error("Cliente sem e-mail cadastrado.");
      return;
    }

    const vars = {
      nome: row.clientName,
      data: row.dateLabel,
      hora: row.timeLabel,
      profissional: row.professionalName,
      servico: row.serviceNames,
      empresa: organizationName,
    };

    const subject = renderTemplate(
      defaultEmailReminder?.subject ?? "Lembrete de agendamento — {{empresa}}",
      vars
    );
    const body = renderTemplate(
      defaultEmailReminder?.body ??
        "Olá, {{nome}}! Lembrando do seu atendimento em {{empresa}} no dia {{data}} às {{hora}}.",
      vars
    );

    const result = await sendCommunicationAction({
      clientId: row.clientId,
      appointmentId: row.appointmentId,
      templateId: defaultEmailReminder?.id ?? "",
      channel: "email",
      category: "reminder",
      recipient: row.clientEmail,
      subject,
      renderedBody: body,
    });

    if (!result.success) {
      toast.error(result.error || "Falha ao enviar e-mail.");
      return;
    }

    toast.success(`E-mail registrado/enviado para ${row.clientEmail}.`);
    router.refresh();
  }

  function openCreateTemplate() {
    setEditingId(null);
    setForm(EMPTY_TEMPLATE);
    setModalOpen(true);
  }

  function openEditTemplate(t: TemplateRow) {
    setEditingId(t.id);
    setForm({
      channel: t.channel,
      category: t.category,
      name: t.name,
      subject: t.subject ?? "",
      body: t.body,
      isActive: t.isActive,
    });
    setModalOpen(true);
  }

  async function handleSaveTemplate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const result = editingId
      ? await updateTemplateAction(editingId, form)
      : await createTemplateAction(form);
    setSaving(false);

    if (!result.success) {
      toast.error(result.error || "Erro ao salvar template.");
      return;
    }

    toast.success(editingId ? "Template atualizado!" : "Template criado!");
    setModalOpen(false);
    router.refresh();
  }

  async function handleDeleteTemplate(t: TemplateRow) {
    if (!window.confirm(`Deseja remover o template "${t.name}"?`)) return;
    const result = await deleteTemplateAction(t.id);
    if (!result.success) {
      toast.error(result.error || "Erro ao remover template.");
      return;
    }
    toast.success("Template removido.");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Top Tabs + Birthdays shortcut */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
          {(
            [
              ["reminders", "Lembretes", Bell],
              ["templates", "Templates", FileText],
              ["history", "Histórico", History],
            ] as const
          ).map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer",
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

        <div className="flex items-center gap-2">
          <Button variant="accent" size="sm" asChild>
            <Link href="/app/comunicacao/aniversariantes">
              <Cake className="h-4 w-4" />
              Aniversariantes
            </Link>
          </Button>
          {tab === "templates" && canManage && (
            <Button size="sm" onClick={openCreateTemplate}>
              <Plus className="h-4 w-4" />
              Novo template
            </Button>
          )}
        </div>
      </div>

      {/* TAB 1: REMINDERS */}
      {tab === "reminders" && (
        <div className="space-y-3">
          {upcomingReminders.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center py-12 text-center">
                <Bell className="h-10 w-10 text-[#2563EB]" />
                <p className="mt-3 font-bold text-[#142B4F]">
                  Nenhum agendamento nos próximos 7 dias
                </p>
                <p className="mt-1 text-xs text-[#64748B]">
                  Quando houver atendimentos agendados, os lembretes prontos aparecerão aqui.
                </p>
              </CardContent>
            </Card>
          ) : (
            upcomingReminders.map((row) => (
              <Card key={row.appointmentId}>
                <CardContent className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-[#142B4F]">{row.clientName}</p>
                      <Badge variant="default">
                        {row.dateLabel} às {row.timeLabel}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-[#64748B]">
                      {row.serviceNames} • {row.professionalName}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleSendWhatsApp(row)}
                      disabled={!row.clientPhone}
                    >
                      <MessageCircle className="h-4 w-4 text-emerald-600" />
                      Abrir WhatsApp
                    </Button>
                    {canManage && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSendEmail(row)}
                        disabled={!row.clientEmail}
                      >
                        <Mail className="h-4 w-4 text-[#2563EB]" />
                        Enviar E-mail
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* TAB 2: TEMPLATES */}
      {tab === "templates" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {templates.map((tpl) => (
            <Card key={tpl.id}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-[#142B4F]">{tpl.name}</p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <Badge variant={tpl.channel === "whatsapp" ? "success" : "default"}>
                        {tpl.channel === "whatsapp" ? "WhatsApp" : "E-mail"}
                      </Badge>
                      <Badge variant="outline">{CATEGORY_LABELS[tpl.category]}</Badge>
                    </div>
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEditTemplate(tpl)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteTemplate(tpl)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-600" />
                      </Button>
                    </div>
                  )}
                </div>

                {tpl.subject && (
                  <p className="text-xs font-semibold text-[#142B4F]">
                    Assunto: {tpl.subject}
                  </p>
                )}

                <p className="whitespace-pre-line rounded-xl bg-[#F5F7FA] p-3 text-xs leading-relaxed text-slate-700">
                  {tpl.body}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* TAB 3: HISTORY */}
      {tab === "history" && (
        <div className="space-y-3">
          {logs.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-sm text-[#64748B]">
                Nenhuma comunicação registrada ainda.
              </CardContent>
            </Card>
          ) : (
            logs.map((log) => (
              <Card key={log.id}>
                <CardContent className="p-4 space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={log.channel === "whatsapp" ? "success" : "default"}>
                        {log.channel === "whatsapp" ? "WhatsApp" : "E-mail"}
                      </Badge>
                      <Badge variant="outline">{CATEGORY_LABELS[log.category]}</Badge>
                      <span className="text-xs font-semibold text-[#142B4F]">
                        {log.recipient}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#64748B]">
                      {new Date(log.createdAtIso).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <p className="text-xs text-[#64748B] line-clamp-2">
                    {log.renderedBody}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Template Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Editar template" : "Novo template de mensagem"}
        description="Use variáveis como {{nome}}, {{data}}, {{hora}}, {{profissional}}, {{servico}} e {{empresa}}."
      >
        <form onSubmit={handleSaveTemplate} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-1">
              <Label htmlFor="t-channel">Canal</Label>
              <select
                id="t-channel"
                value={form.channel}
                onChange={(e) =>
                  setForm({ ...form, channel: e.target.value as MessageChannel })
                }
                className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#142B4F]"
              >
                <option value="whatsapp">WhatsApp (wa.me)</option>
                <option value="email">E-mail</option>
              </select>
            </div>
            <div className="space-y-1.5 sm:col-span-1">
              <Label htmlFor="t-cat">Categoria</Label>
              <select
                id="t-cat"
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value as MessageCategory })
                }
                className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#142B4F]"
              >
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5 sm:col-span-1">
              <Label htmlFor="t-name">Nome *</Label>
              <Input
                id="t-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
          </div>

          {form.channel === "email" && (
            <div className="space-y-1.5">
              <Label htmlFor="t-subject">Assunto do e-mail</Label>
              <Input
                id="t-subject"
                placeholder="Ex.: Lembrete do seu atendimento em {{empresa}}"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="t-body">Mensagem *</Label>
            <textarea
              id="t-body"
              rows={5}
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-[#142B4F]"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingId ? "Salvar alterações" : "Criar template"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

