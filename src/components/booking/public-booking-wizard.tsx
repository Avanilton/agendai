"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  MessageCircle,
  Phone,
  Sparkles,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrencyBRL, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PublicService {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  priceCents: number;
  durationMinutes: number;
  bufferMinutes: number;
  professionalIds: string[];
}

interface PublicProfessional {
  id: string;
  name: string;
  specialty: string | null;
  color: string;
}

interface PublicBookingWizardProps {
  organization: {
    name: string;
    slug: string;
    segment: string;
    phone: string | null;
    address: string | null;
  };
  settings: {
    allowAnyProfessional: boolean;
    maxAdvanceDays: number;
    cancellationPolicyHours: number;
    welcomeMessage: string | null;
  };
  services: PublicService[];
  professionals: PublicProfessional[];
}

interface ConfirmationData {
  appointmentId: string;
  organizationName: string;
  organizationPhone: string | null;
  serviceName: string;
  professionalName: string;
  date: string;
  time: string;
  durationMinutes: number;
  totalPriceCents: number;
  status: string;
}

function getTodayBrazil(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  return `${parts.find((p) => p.type === "year")?.value}-${parts.find((p) => p.type === "month")?.value}-${parts.find((p) => p.type === "day")?.value}`;
}

export function PublicBookingWizard({
  organization,
  settings,
  services,
  professionals,
}: PublicBookingWizardProps) {
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>(
    settings.allowAnyProfessional ? "any" : ""
  );
  const [selectedDate, setSelectedDate] = useState<string>(getTodayBrazil);
  const [selectedTime, setSelectedTime] = useState<string>("");

  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [acceptedLgpd, setAcceptedLgpd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<ConfirmationData | null>(null);

  const selectedService = useMemo(
    () => services.find((s) => s.id === selectedServiceId) ?? null,
    [services, selectedServiceId]
  );

  const eligibleProfessionals = useMemo(() => {
    if (!selectedService) return [];
    if (selectedService.professionalIds.length === 0) return professionals;
    return professionals.filter((p) =>
      selectedService.professionalIds.includes(p.id)
    );
  }, [selectedService, professionals]);

  const maxDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + settings.maxAdvanceDays);
    return d.toISOString().slice(0, 10);
  }, [settings.maxAdvanceDays]);

  const canFetchSlots = Boolean(
    selectedServiceId && selectedDate && selectedProfessionalId
  );

  useEffect(() => {
    if (!canFetchSlots) {
      return;
    }

    const controller = new AbortController();

    async function loadSlots() {
      setLoadingSlots(true);
      try {
        const url = `/api/public/booking/${encodeURIComponent(
          organization.slug
        )}/slots?serviceId=${encodeURIComponent(
          selectedServiceId
        )}&date=${encodeURIComponent(selectedDate)}&professionalId=${encodeURIComponent(
          selectedProfessionalId
        )}`;

        const res = await fetch(url, { signal: controller.signal });
        const data = (await res.json()) as { slots?: string[] };
        if (!controller.signal.aborted) {
          setSlots(data.slots ?? []);
        }
      } catch {
        if (!controller.signal.aborted) {
          setSlots([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingSlots(false);
        }
      }
    }

    void loadSlots();

    return () => {
      controller.abort();
    };
  }, [
    canFetchSlots,
    organization.slug,
    selectedServiceId,
    selectedDate,
    selectedProfessionalId,
  ]);

  const visibleSlots = canFetchSlots ? slots : [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedServiceId || !selectedProfessionalId || !selectedTime) {
      toast.error("Selecione serviço, profissional, data e horário.");
      return;
    }
    if (!acceptedLgpd) {
      toast.error("Aceite o consentimento LGPD para finalizar o agendamento.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/public/booking/${encodeURIComponent(organization.slug)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            serviceId: selectedServiceId,
            professionalId: selectedProfessionalId,
            date: selectedDate,
            time: selectedTime,
            clientName,
            clientPhone,
            clientEmail,
            notes,
            acceptedLgpd: true,
          }),
        }
      );

      const data = (await res.json()) as {
        error?: string;
        booking?: ConfirmationData;
      };

      if (!res.ok || !data.booking) {
        toast.error(data.error || "Não foi possível concluir a reserva.");
        setSubmitting(false);
        return;
      }

      setConfirmation(data.booking);
      toast.success("Agendamento realizado com sucesso!");
    } catch {
      toast.error("Erro de conexão ao enviar reserva.");
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmation) {
    const cleanOrgPhone = (confirmation.organizationPhone ?? "").replace(/\D/g, "");
    const formattedDate = confirmation.date.split("-").reverse().join("/");
    const waText = encodeURIComponent(
      `Olá! Acabei de agendar ${confirmation.serviceName} com ${confirmation.professionalName} para ${formattedDate} às ${confirmation.time} pelo Agendai.`
    );

    return (
      <Card className="mx-auto max-w-xl shadow-lg">
        <CardContent className="p-6 sm:p-8 text-center space-y-5">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div>
            <Badge variant="success">
              {confirmation.status === "confirmed"
                ? "Agendamento Confirmado"
                : "Solicitação Recebida"}
            </Badge>
            <h2 className="mt-2 text-2xl font-extrabold text-[#142B4F]">
              Tudo certo, {clientName.split(" ")[0]}!
            </h2>
            <p className="mt-1 text-sm text-[#64748B]">
              Seu horário em <strong>{confirmation.organizationName}</strong> foi registrado.
            </p>
          </div>

          <div className="rounded-xl bg-[#F5F7FA] p-4 text-left text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-[#64748B]">Serviço</span>
              <strong className="text-[#142B4F]">{confirmation.serviceName}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748B]">Profissional</span>
              <strong className="text-[#142B4F]">{confirmation.professionalName}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748B]">Data e hora</span>
              <strong className="text-[#2563EB]">
                {formattedDate} às {confirmation.time}
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748B]">Valor estimado</span>
              <strong className="text-[#142B4F]">
                {formatCurrencyBRL(confirmation.totalPriceCents)}
              </strong>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            {cleanOrgPhone.length >= 10 && (
              <Button variant="accent" asChild>
                <a
                  href={`https://wa.me/55${cleanOrgPhone}?text=${waText}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle className="h-4 w-4" />
                  Enviar confirmação no WhatsApp
                </a>
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => {
                setConfirmation(null);
                setSelectedTime("");
              }}
            >
              Fazer novo agendamento
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Organization Header Card */}
      <Card className="border-slate-200/80 shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Badge variant="orange">{organization.segment}</Badge>
              <h1 className="mt-2 text-2xl font-extrabold text-[#142B4F]">
                {organization.name}
              </h1>
              {settings.welcomeMessage && (
                <p className="mt-1 text-sm text-[#64748B]">
                  {settings.welcomeMessage}
                </p>
              )}
            </div>
            <div className="space-y-1 text-xs text-[#64748B]">
              {organization.phone && (
                <p className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-[#2563EB]" />
                  {organization.phone}
                </p>
              )}
              {organization.address && (
                <p className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-[#2563EB]" />
                  {organization.address}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Service */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">1. Escolha o serviço</CardTitle>
          </CardHeader>
          <CardContent>
            {services.length === 0 ? (
              <p className="text-sm text-[#64748B]">
                Nenhum serviço disponível para agendamento online no momento.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {services.map((svc) => {
                  const active = svc.id === selectedServiceId;
                  return (
                    <button
                      key={svc.id}
                      type="button"
                      onClick={() => {
                        setSelectedServiceId(svc.id);
                        setSelectedProfessionalId(
                          settings.allowAnyProfessional ? "any" : ""
                        );
                        setSelectedTime("");
                      }}
                      className={cn(
                        "flex flex-col items-start justify-between rounded-xl border p-4 text-left transition-all cursor-pointer",
                        active
                          ? "border-[#2563EB] bg-[#EAF2FF]/60 ring-2 ring-[#2563EB]/20"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      )}
                    >
                      <div className="w-full">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-sm text-[#142B4F]">
                            {svc.name}
                          </span>
                          <span className="text-sm font-extrabold text-[#2563EB]">
                            {formatCurrencyBRL(svc.priceCents)}
                          </span>
                        </div>
                        {svc.description && (
                          <p className="mt-1 text-xs text-[#64748B] line-clamp-2">
                            {svc.description}
                          </p>
                        )}
                      </div>
                      <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-[#64748B]">
                        <Clock className="h-3 w-3" />
                        {svc.durationMinutes} min
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Professional */}
        {selectedService && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">2. Escolha o profissional</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3">
                {settings.allowAnyProfessional && (
                  <button
                    type="button"
                    onClick={() => setSelectedProfessionalId("any")}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl border p-3 text-left transition-all cursor-pointer",
                      selectedProfessionalId === "any"
                        ? "border-[#2563EB] bg-[#EAF2FF]/60 ring-2 ring-[#2563EB]/20"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    )}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FF914D] text-[#142B4F]">
                      <Sparkles className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-xs font-bold text-[#142B4F]">
                        Qualquer disponível
                      </p>
                      <p className="text-[11px] text-[#64748B]">Mais horários</p>
                    </div>
                  </button>
                )}

                {eligibleProfessionals.map((prof) => {
                  const active = selectedProfessionalId === prof.id;
                  return (
                    <button
                      key={prof.id}
                      type="button"
                      onClick={() => setSelectedProfessionalId(prof.id)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-xl border p-3 text-left transition-all cursor-pointer",
                        active
                          ? "border-[#2563EB] bg-[#EAF2FF]/60 ring-2 ring-[#2563EB]/20"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      )}
                    >
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                        style={{ backgroundColor: prof.color }}
                      >
                        <User className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-[#142B4F]">
                          {prof.name}
                        </p>
                        {prof.specialty && (
                          <p className="truncate text-[11px] text-[#64748B]">
                            {prof.specialty}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Date & Available Time Slots */}
        {selectedService && selectedProfessionalId && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4 text-[#2563EB]" />
                3. Escolha a data e o horário
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-w-xs space-y-1.5">
                <Label htmlFor="pub-date">Data</Label>
                <Input
                  id="pub-date"
                  type="date"
                  min={getTodayBrazil()}
                  max={maxDate}
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setSelectedTime("");
                  }}
                />
              </div>

              {loadingSlots ? (
                <div className="flex items-center gap-2 py-4 text-sm text-[#64748B]">
                  <Loader2 className="h-4 w-4 animate-spin text-[#2563EB]" />
                  Consultando horários disponíveis...
                </div>
              ) : visibleSlots.length === 0 ? (
                <p className="rounded-xl bg-[#F5F7FA] p-4 text-sm text-[#64748B]">
                  Nenhum horário disponível para esta data. Tente selecionar outro dia.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-6">
                  {visibleSlots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSelectedTime(slot)}
                      className={cn(
                        "rounded-lg border py-2.5 text-sm font-semibold transition-all cursor-pointer",
                        selectedTime === slot
                          ? "border-[#2563EB] bg-[#2563EB] text-white shadow-sm"
                          : "border-slate-200 bg-white text-[#142B4F] hover:border-[#2563EB]/50"
                      )}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 4: Client Info & Confirmation */}
        {selectedTime && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">4. Seus dados para confirmação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="pub-name">Seu nome completo *</Label>
                  <Input
                    id="pub-name"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pub-phone">WhatsApp / Telefone *</Label>
                  <Input
                    id="pub-phone"
                    placeholder="(11) 99999-9999"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="pub-email">E-mail (opcional)</Label>
                  <Input
                    id="pub-email"
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pub-notes">Observações (opcional)</Label>
                  <Input
                    id="pub-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>

              {settings.cancellationPolicyHours > 0 && (
                <p className="text-xs text-[#64748B]">
                  Política de cancelamento: avise com pelo menos{" "}
                  <strong>{settings.cancellationPolicyHours} horas</strong> de
                  antecedência.
                </p>
              )}

              <label className="flex items-start gap-2.5 rounded-xl bg-[#F5F7FA] p-3 text-xs text-[#142B4F] cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptedLgpd}
                  onChange={(e) => setAcceptedLgpd(e.target.checked)}
                  className="mt-0.5"
                  required
                />
                <span>
                  Autorizo o uso dos meus dados exclusivamente para realização e
                  confirmação deste agendamento, conforme a{" "}
                  <Link href="/privacidade" className="font-semibold text-[#2563EB] underline">
                    Política de Privacidade
                  </Link>{" "}
                  e a LGPD.
                </span>
              </label>

              <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {submitting ? "Confirmando horário..." : "Confirmar agendamento"}
              </Button>
            </CardContent>
          </Card>
        )}
      </form>
    </div>
  );
}
