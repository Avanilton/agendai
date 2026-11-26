"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Cake,
  Calendar,
  FileHeart,
  Layers,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  ShoppingBag,
  User,
  Wallet,
} from "lucide-react";
import type { ClientFullProfile } from "@/modules/clients/profile-service";
import { buildWhatsAppUrl } from "@/modules/communications/templates";
import { formatCurrencyBRL, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ClientQuickFormModal } from "@/components/cadastros/client-quick-form-modal";

type DetailTab =
  | "resumo"
  | "agendamentos"
  | "anamnese"
  | "financeiro"
  | "pacotes";

const APPT_STATUS_LABELS: Record<string, { label: string; className: string }> = {
  waiting: { label: "Aguardando", className: "bg-[#FFF0E5] text-[#C2410C]" },
  confirmed: { label: "Confirmado", className: "bg-emerald-50 text-emerald-700" },
  in_progress: { label: "Em atendimento", className: "bg-[#EAF2FF] text-[#2563EB]" },
  completed: { label: "Concluído", className: "bg-slate-200 text-[#142B4F]" },
  cancelled: { label: "Cancelado", className: "bg-red-50 text-red-700" },
  no_show: { label: "Não compareceu", className: "bg-rose-100 text-rose-800" },
};

const TX_STATUS_LABELS: Record<string, { label: string; className: string }> = {
  paid: { label: "Pago", className: "bg-emerald-50 text-emerald-700" },
  pending: { label: "Pendente", className: "bg-[#FFF0E5] text-[#C2410C]" },
  partial: { label: "Parcial", className: "bg-amber-50 text-amber-700" },
  cancelled: { label: "Cancelado", className: "bg-red-50 text-red-700" },
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  pix: "PIX",
  cash: "Dinheiro",
  credit_card: "Cartão de Crédito",
  debit_card: "Cartão de Débito",
  bank_transfer: "Transferência",
  other: "Outro",
};

const RECORD_CATEGORY_LABELS: Record<string, string> = {
  anamnesis: "Anamnese",
  medical: "Médica",
  dental: "Odontológica",
  aesthetic: "Estética",
  evaluation: "Avaliação",
  photography: "Fotografia",
  attendance: "Atendimento",
  consent: "Consentimento",
};

function formatDateTimeBR(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatDateBR(dateStr: string | null): string {
  if (!dateStr) return "—";
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr.split("-").reverse().join("/");
  }
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(dateStr));
}

function isBirthdayToday(birthDate: string | null): boolean {
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return false;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const m = parts.find((p) => p.type === "month")?.value ?? "";
  const d = parts.find((p) => p.type === "day")?.value ?? "";
  return birthDate.slice(5, 10) === `${m}-${d}`;
}

interface ClientDetailViewProps {
  profile: ClientFullProfile;
  organizationName: string;
  canWriteClients: boolean;
}

export function ClientDetailView({
  profile,
  organizationName,
  canWriteClients,
}: ClientDetailViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab") as DetailTab | null;
  const validTabs: DetailTab[] = [
    "resumo",
    "agendamentos",
    "anamnese",
    "financeiro",
    "pacotes",
  ];
  const initialTab: DetailTab =
    rawTab && validTabs.includes(rawTab) ? rawTab : "agendamentos";

  const [activeTab, setActiveTab] = useState<DetailTab>(initialTab);
  const [editOpen, setEditOpen] = useState(false);

  const { client, summary } = profile;
  const phone = client.whatsapp || client.phone;
  const bdayToday = isBirthdayToday(client.birthDate);
  const whatsUrl = buildWhatsAppUrl(
    phone,
    bdayToday
      ? `Parabéns pelo seu dia, ${client.name}! 🎉 A equipe ${organizationName} deseja muita saúde, alegria e sucesso neste novo ciclo!`
      : `Olá, ${client.name}! Tudo bem? Aqui é da equipe ${organizationName}.`
  );

  const initials = client.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  const tabs: {
    id: DetailTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
  }[] = [
    { id: "resumo", label: "Dados cadastrais", icon: User },
    {
      id: "agendamentos",
      label: "Agendamentos",
      icon: Calendar,
      count: profile.appointments.length,
    },
    {
      id: "anamnese",
      label: "Fichas e Anamnese",
      icon: FileHeart,
      count: profile.records.length,
    },
    {
      id: "financeiro",
      label: "Financeiro",
      icon: Wallet,
      count: profile.transactions.length + profile.sales.length,
    },
    {
      id: "pacotes",
      label: "Pacotes e Orçamentos",
      icon: Layers,
      count: profile.packages.length + profile.budgets.length,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top back bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/app/clientes">
            <ArrowLeft className="h-4 w-4" />
            Voltar para Clientes
          </Link>
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          {whatsUrl && (
            <Button size="sm" variant="outline" asChild>
              <a href={whatsUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-4 w-4 text-emerald-600" />
                {bdayToday ? "Enviar parabéns no WhatsApp" : "Enviar WhatsApp"}
              </a>
            </Button>
          )}
          {canWriteClients && (
            <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" />
              Editar cadastro
            </Button>
          )}
          <Button size="sm" asChild>
            <Link href="/app/agenda">
              <Calendar className="h-4 w-4" />
              Ir para Agenda
            </Link>
          </Button>
        </div>
      </div>

      {/* Birthday alert banner */}
      {bdayToday && (
        <Card className="border-amber-300 bg-gradient-to-r from-[#FFF0E5] via-amber-50 to-pink-50">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FF914D] text-white">
                <Cake className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-[#142B4F]">
                  🎉 Hoje é aniversário de {client.name}!
                </p>
                <p className="text-xs text-[#64748B]">
                  Aproveite para enviar uma mensagem carinhosa de parabéns.
                </p>
              </div>
            </div>
            {whatsUrl && (
              <Button size="sm" variant="accent" asChild>
                <a href={whatsUrl} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-4 w-4" />
                  Enviar mensagem de aniversário
                </a>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Client Header Card */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4 min-w-0">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#2563EB] text-lg font-extrabold text-white">
                {initials || "CL"}
              </div>
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-extrabold text-[#142B4F] truncate">
                    {client.name}
                  </h1>
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
                  {client.origin && (
                    <Badge variant="outline">{client.origin}</Badge>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#64748B]">
                  {phone && (
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5 text-[#2563EB]" />
                      {phone}
                    </span>
                  )}
                  {client.email && (
                    <span className="inline-flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5 text-[#2563EB]" />
                      {client.email}
                    </span>
                  )}
                  {client.birthDate && (
                    <span className="inline-flex items-center gap-1">
                      <Cake className="h-3.5 w-3.5 text-[#FF914D]" />
                      Nasc.: {formatDateBR(client.birthDate)}
                    </span>
                  )}
                </div>

                {client.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {client.tags.map((tag) => (
                      <Badge key={tag} variant="default" className="text-[10px]">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-[#64748B]">Agendamentos</p>
            <p className="mt-1 text-2xl font-extrabold text-[#142B4F]">
              {summary.totalAppointments}
            </p>
            <p className="mt-0.5 text-[11px] text-[#64748B]">
              {summary.completedAppointments} concluídos •{" "}
              {summary.upcomingAppointments} futuros
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-[#64748B]">Total pago</p>
            <p className="mt-1 text-2xl font-extrabold text-emerald-700">
              {formatCurrencyBRL(summary.totalPaidCents)}
            </p>
            <p className="mt-0.5 text-[11px] text-[#64748B]">
              Vendas: {formatCurrencyBRL(summary.totalSalesCents)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-[#64748B]">
              Pendências financeiras
            </p>
            <p className="mt-1 text-2xl font-extrabold text-[#C2410C]">
              {formatCurrencyBRL(summary.totalPendingCents)}
            </p>
            <p className="mt-0.5 text-[11px] text-[#64748B]">
              Em aberto / parcelado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-[#64748B]">
              Fichas e Anamnese
            </p>
            <p className="mt-1 text-2xl font-extrabold text-[#2563EB]">
              {summary.totalRecords}
            </p>
            <p className="mt-0.5 text-[11px] text-[#64748B]">
              Registros clínicos salvos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap gap-1.5 rounded-2xl border border-slate-200 bg-white p-1.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer",
                active
                  ? "bg-[#2563EB] text-white shadow-xs"
                  : "text-[#64748B] hover:bg-slate-100 hover:text-[#142B4F]"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
                    active
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-[#142B4F]"
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB: RESUMO / DADOS CADASTRAIS */}
      {activeTab === "resumo" && (
        <Card>
          <CardContent className="p-6 space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <p className="text-[11px] font-semibold uppercase text-[#64748B]">
                  CPF
                </p>
                <p className="mt-0.5 text-sm font-medium text-[#142B4F]">
                  {client.cpf || "Não informado"}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase text-[#64748B]">
                  Telefone
                </p>
                <p className="mt-0.5 text-sm font-medium text-[#142B4F]">
                  {client.phone || "Não informado"}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase text-[#64748B]">
                  WhatsApp
                </p>
                <p className="mt-0.5 text-sm font-medium text-[#142B4F]">
                  {client.whatsapp || "Não informado"}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase text-[#64748B]">
                  E-mail
                </p>
                <p className="mt-0.5 text-sm font-medium text-[#142B4F]">
                  {client.email || "Não informado"}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase text-[#64748B]">
                  Data de nascimento
                </p>
                <p className="mt-0.5 text-sm font-medium text-[#142B4F]">
                  {formatDateBR(client.birthDate)}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase text-[#64748B]">
                  Cliente desde
                </p>
                <p className="mt-0.5 text-sm font-medium text-[#142B4F]">
                  {formatDateBR(client.createdAtIso)}
                </p>
              </div>
            </div>

            {client.address && (
              <div className="rounded-xl bg-[#F5F7FA] p-3.5">
                <p className="flex items-center gap-1.5 text-xs font-bold text-[#142B4F]">
                  <MapPin className="h-3.5 w-3.5 text-[#2563EB]" />
                  Endereço
                </p>
                <p className="mt-1 text-sm text-[#64748B]">{client.address}</p>
              </div>
            )}

            {client.notes && (
              <div className="rounded-xl bg-[#F5F7FA] p-3.5">
                <p className="text-xs font-bold text-[#142B4F]">Observações</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-[#64748B]">
                  {client.notes}
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-1 text-xs">
              <Badge variant={client.contactPreferences.whatsapp ? "success" : "outline"}>
                WhatsApp: {client.contactPreferences.whatsapp ? "Autorizado" : "Não autorizado"}
              </Badge>
              <Badge variant={client.contactPreferences.email ? "success" : "outline"}>
                E-mail: {client.contactPreferences.email ? "Autorizado" : "Não autorizado"}
              </Badge>
              <Badge variant={client.lgpdConsentAtIso ? "success" : "outline"}>
                LGPD: {client.lgpdConsentAtIso ? `Registrado em ${formatDateBR(client.lgpdConsentAtIso)}` : "Não registrado"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB: HISTÓRICO DE AGENDAMENTOS */}
      {activeTab === "agendamentos" && (
        <div className="space-y-3">
          {!profile.permissions.canReadAppointments ? (
            <Card>
              <CardContent className="p-6 text-sm text-[#64748B]">
                Você não possui permissão para visualizar o histórico de agendamentos.
              </CardContent>
            </Card>
          ) : profile.appointments.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center py-10 text-center">
                <Calendar className="h-8 w-8 text-[#2563EB]" />
                <p className="mt-2 font-bold text-[#142B4F]">
                  Nenhum agendamento registrado
                </p>
                <p className="mt-1 text-xs text-[#64748B]">
                  Os atendimentos deste cliente aparecerão aqui.
                </p>
              </CardContent>
            </Card>
          ) : (
            profile.appointments.map((appt) => {
              const meta = APPT_STATUS_LABELS[appt.status] ?? {
                label: appt.status,
                className: "bg-slate-100 text-slate-700",
              };
              return (
                <Card key={appt.id}>
                  <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div
                        className="mt-0.5 h-10 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: appt.professionalColor }}
                      />
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-[#142B4F]">
                            {formatDateTimeBR(appt.startsAtIso)}
                          </span>
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                              meta.className
                            )}
                          >
                            {meta.label}
                          </span>
                          {appt.isOverbooking && (
                            <Badge variant="orange" className="text-[10px]">
                              Encaixe
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-[#64748B]">
                          <strong className="text-[#142B4F]">
                            {appt.professionalName}
                          </strong>{" "}
                          •{" "}
                          {appt.services.map((s) => s.serviceName).join(", ") ||
                            "Serviço"}{" "}
                          ({appt.durationMinutes} min)
                        </p>
                        {appt.notes && (
                          <p className="text-xs text-[#64748B] italic">
                            Obs.: {appt.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-extrabold text-[#2563EB]">
                        {formatCurrencyBRL(appt.totalPriceCents)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* TAB: FICHAS E ANAMNESE */}
      {activeTab === "anamnese" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" variant="outline" asChild>
              <Link href="/app/fichas">
                <FileHeart className="h-4 w-4" />
                Abrir módulo de Fichas e Anamnese
              </Link>
            </Button>
          </div>

          {!profile.permissions.canReadRecords ? (
            <Card>
              <CardContent className="p-6 text-sm text-[#64748B]">
                Você não possui permissão para visualizar fichas e anamneses.
              </CardContent>
            </Card>
          ) : profile.records.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center py-10 text-center">
                <FileHeart className="h-8 w-8 text-[#2563EB]" />
                <p className="mt-2 font-bold text-[#142B4F]">
                  Nenhuma ficha de anamnese preenchida
                </p>
                <p className="mt-1 text-xs text-[#64748B]">
                  Acesse o módulo de Fichas e Anamnese para registrar a primeira avaliação deste cliente.
                </p>
              </CardContent>
            </Card>
          ) : (
            profile.records.map((rec) => {
              const entries = Object.entries(rec.answers);
              return (
                <Card key={rec.id}>
                  <CardContent className="p-5 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-extrabold text-[#142B4F]">
                            {rec.templateNameSnapshot}
                          </h3>
                          <Badge variant="outline">
                            {RECORD_CATEGORY_LABELS[rec.category] ?? rec.category}
                          </Badge>
                          <Badge variant="default" className="text-[10px]">
                            v{rec.version}
                          </Badge>
                        </div>
                        <p className="mt-0.5 text-xs text-[#64748B]">
                          Preenchida em {formatDateTimeBR(rec.createdAtIso)}
                          {rec.professionalName
                            ? ` • Profissional: ${rec.professionalName}`
                            : ""}
                        </p>
                      </div>
                    </div>

                    {entries.length > 0 && (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {entries.map(([key, value]) => (
                          <div
                            key={key}
                            className="rounded-xl bg-[#F5F7FA] p-3 text-xs"
                          >
                            <p className="font-bold text-[#142B4F]">
                              {rec.fieldLabels[key] || key}
                            </p>
                            <p className="mt-1 whitespace-pre-wrap text-[#64748B]">
                              {typeof value === "boolean"
                                ? value
                                  ? "Sim"
                                  : "Não"
                                : String(value || "—")}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {rec.notes && (
                      <div className="rounded-xl border border-slate-200 p-3 text-xs">
                        <p className="font-bold text-[#142B4F]">
                          Observações adicionais
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-[#64748B]">
                          {rec.notes}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* TAB: HISTÓRICO FINANCEIRO */}
      {activeTab === "financeiro" && (
        <div className="space-y-5">
          {!profile.permissions.canReadFinancial ? (
            <Card>
              <CardContent className="p-6 text-sm text-[#64748B]">
                Você não possui permissão para visualizar o histórico financeiro.
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Financial Transactions */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wide text-[#64748B]">
                  Lançamentos financeiros ({profile.transactions.length})
                </h3>
                {profile.transactions.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="py-8 text-center text-xs text-[#64748B]">
                      Nenhum lançamento financeiro vinculado a este cliente.
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-slate-200 bg-[#F5F7FA] uppercase text-[#64748B]">
                          <tr>
                            <th className="px-4 py-3 font-semibold">Descrição</th>
                            <th className="px-4 py-3 font-semibold">Vencimento</th>
                            <th className="px-4 py-3 font-semibold">Pagamento</th>
                            <th className="px-4 py-3 font-semibold">Status</th>
                            <th className="px-4 py-3 text-right font-semibold">Valor</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {profile.transactions.map((tx) => {
                            const meta = TX_STATUS_LABELS[tx.status] ?? {
                              label: tx.status,
                              className: "bg-slate-100 text-slate-700",
                            };
                            return (
                              <tr key={tx.id}>
                                <td className="px-4 py-3">
                                  <p className="font-semibold text-[#142B4F]">
                                    {tx.description}
                                  </p>
                                  <p className="text-[11px] text-[#64748B]">
                                    {[tx.categoryName, tx.accountName]
                                      .filter(Boolean)
                                      .join(" • ") || "—"}
                                  </p>
                                </td>
                                <td className="px-4 py-3 text-[#64748B]">
                                  {formatDateBR(tx.dueDate)}
                                </td>
                                <td className="px-4 py-3 text-[#64748B]">
                                  {PAYMENT_METHOD_LABELS[tx.paymentMethod] ??
                                    tx.paymentMethod}
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={cn(
                                      "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                                      meta.className
                                    )}
                                  >
                                    {meta.label}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right font-bold text-[#142B4F]">
                                  {formatCurrencyBRL(tx.amountCents)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}
              </div>

              {/* Sales */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wide text-[#64748B]">
                  Vendas e Compras ({profile.sales.length})
                </h3>
                {profile.sales.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="py-8 text-center text-xs text-[#64748B]">
                      Nenhuma venda registrada para este cliente.
                    </CardContent>
                  </Card>
                ) : (
                  profile.sales.map((sale) => (
                    <Card key={sale.id}>
                      <CardContent className="p-4 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <ShoppingBag className="h-4 w-4 text-[#2563EB]" />
                            <span className="text-sm font-bold text-[#142B4F]">
                              Venda em {formatDateTimeBR(sale.createdAtIso)}
                            </span>
                            <Badge
                              variant={
                                sale.status === "completed"
                                  ? "success"
                                  : "destructive"
                              }
                            >
                              {sale.status === "completed"
                                ? "Concluída"
                                : "Cancelada"}
                            </Badge>
                          </div>
                          <p className="text-sm font-extrabold text-[#2563EB]">
                            {formatCurrencyBRL(sale.totalCents)}
                          </p>
                        </div>
                        <p className="text-xs text-[#64748B]">
                          {PAYMENT_METHOD_LABELS[sale.paymentMethod] ??
                            sale.paymentMethod}
                          {sale.installments > 1
                            ? ` • ${sale.installments}x`
                            : ""}
                        </p>
                        {sale.items.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {sale.items.map((item) => (
                              <Badge key={item.id} variant="outline">
                                {item.quantity}x {item.nameSnapshot} (
                                {formatCurrencyBRL(item.totalCents)})
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB: PACOTES E ORÇAMENTOS */}
      {activeTab === "pacotes" && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wide text-[#64748B]">
              Pacotes ({profile.packages.length})
            </h3>
            {profile.packages.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center text-xs text-[#64748B]">
                  Nenhum pacote ativo ou anterior.
                </CardContent>
              </Card>
            ) : (
              profile.packages.map((pkg) => (
                <Card key={pkg.id}>
                  <CardContent className="p-4 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-[#142B4F]">
                        {pkg.name}
                      </p>
                      <Badge
                        variant={
                          pkg.status === "active"
                            ? "success"
                            : pkg.status === "completed"
                              ? "default"
                              : "outline"
                        }
                      >
                        {pkg.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-[#64748B]">
                      Sessões: {pkg.usedSessions} / {pkg.totalSessions} •{" "}
                      {formatCurrencyBRL(pkg.priceCents)}
                    </p>
                    {pkg.expiresAt && (
                      <p className="text-[11px] text-[#64748B]">
                        Validade: {formatDateBR(pkg.expiresAt)}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wide text-[#64748B]">
              Orçamentos ({profile.budgets.length})
            </h3>
            {profile.budgets.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center text-xs text-[#64748B]">
                  Nenhum orçamento registrado.
                </CardContent>
              </Card>
            ) : (
              profile.budgets.map((budget) => (
                <Card key={budget.id}>
                  <CardContent className="p-4 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-[#142B4F]">
                        {budget.title}
                      </p>
                      <Badge variant="outline">{budget.status}</Badge>
                    </div>
                    <p className="text-xs font-semibold text-[#2563EB]">
                      {formatCurrencyBRL(budget.totalCents)}
                    </p>
                    {budget.validUntil && (
                      <p className="text-[11px] text-[#64748B]">
                        Válido até: {formatDateBR(budget.validUntil)}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* Inline Edit Client Modal */}
      {canWriteClients && (
        <ClientQuickFormModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          mode="edit"
          initialValues={{
            id: client.id,
            name: client.name,
            cpf: client.cpf,
            phone: client.phone,
            whatsapp: client.whatsapp,
            email: client.email,
            birthDate: client.birthDate,
            address: client.address,
            notes: client.notes,
            tags: client.tags,
            origin: client.origin,
            status: client.status,
            whatsappOptIn: client.contactPreferences.whatsapp ?? true,
            emailOptIn: client.contactPreferences.email ?? true,
            lgpdConsent: Boolean(client.lgpdConsentAtIso),
          }}
          onSaved={() => router.refresh()}
        />
      )}
    </div>
  );
}

