"use client";

import { useState } from "react";
import Link from "next/link";
import { Copy, ExternalLink, Globe, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { saveBookingSettingsAction } from "@/modules/booking/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface BookingSettingsCardProps {
  organizationSlug: string;
  initialSettings: {
    isEnabled: boolean;
    allowAnyProfessional: boolean;
    minAdvanceMinutes: number;
    maxAdvanceDays: number;
    slotIntervalMinutes: number;
    autoConfirm: boolean;
    cancellationPolicyHours: number;
    welcomeMessage: string | null;
  };
  canWrite: boolean;
}

export function BookingSettingsCard({
  organizationSlug,
  initialSettings,
  canWrite,
}: BookingSettingsCardProps) {
  const [form, setForm] = useState({
    ...initialSettings,
    welcomeMessage: initialSettings.welcomeMessage ?? "",
  });
  const [saving, setSaving] = useState(false);

  const publicPath = `/agendar/${organizationSlug}`;

  async function handleCopyLink() {
    const fullUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}${publicPath}`
        : publicPath;
    await navigator.clipboard.writeText(fullUrl);
    toast.success("Link de agendamento copiado!");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const result = await saveBookingSettingsAction(form);
    setSaving(false);

    if (!result.success) {
      toast.error(result.error || "Erro ao salvar configurações.");
      return;
    }
    toast.success("Configurações de agendamento online salvas!");
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-[#2563EB]" />
              Agendamento Online Público
            </CardTitle>
            <CardDescription>
              Compartilhe seu link exclusivo para clientes agendarem 24h por dia.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant="outline" onClick={handleCopyLink}>
              <Copy className="h-4 w-4" />
              Copiar link
            </Button>
            <Button type="button" size="sm" variant="secondary" asChild>
              <Link href={publicPath} target="_blank">
                <ExternalLink className="h-4 w-4" />
                Abrir página
              </Link>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-wrap gap-4 rounded-xl bg-[#F5F7FA] p-3.5 text-xs font-medium text-[#142B4F]">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isEnabled}
                disabled={!canWrite}
                onChange={(e) => setForm({ ...form, isEnabled: e.target.checked })}
              />
              Ativar página de agendamento online
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.allowAnyProfessional}
                disabled={!canWrite}
                onChange={(e) =>
                  setForm({ ...form, allowAnyProfessional: e.target.checked })
                }
              />
              Permitir &quot;Qualquer profissional disponível&quot;
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.autoConfirm}
                disabled={!canWrite}
                onChange={(e) => setForm({ ...form, autoConfirm: e.target.checked })}
              />
              Confirmar automaticamente novos agendamentos
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="bs-min">Antecedência mín. (min)</Label>
              <Input
                id="bs-min"
                type="number"
                min="0"
                disabled={!canWrite}
                value={form.minAdvanceMinutes}
                onChange={(e) =>
                  setForm({ ...form, minAdvanceMinutes: Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bs-max">Dias futuros máx.</Label>
              <Input
                id="bs-max"
                type="number"
                min="1"
                max="365"
                disabled={!canWrite}
                value={form.maxAdvanceDays}
                onChange={(e) =>
                  setForm({ ...form, maxAdvanceDays: Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bs-int">Intervalo da grade</Label>
              <select
                id="bs-int"
                disabled={!canWrite}
                value={form.slotIntervalMinutes}
                onChange={(e) =>
                  setForm({ ...form, slotIntervalMinutes: Number(e.target.value) })
                }
                className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#142B4F]"
              >
                {[15, 20, 30, 45, 60].map((v) => (
                  <option key={v} value={v}>
                    {v} minutos
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bs-cancel">Cancelamento (horas)</Label>
              <Input
                id="bs-cancel"
                type="number"
                min="0"
                max="168"
                disabled={!canWrite}
                value={form.cancellationPolicyHours}
                onChange={(e) =>
                  setForm({
                    ...form,
                    cancellationPolicyHours: Number(e.target.value),
                  })
                }
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bs-welcome">Mensagem de boas-vindas (opcional)</Label>
            <Input
              id="bs-welcome"
              placeholder="Ex.: Escolha o melhor horário para o seu atendimento!"
              disabled={!canWrite}
              value={form.welcomeMessage}
              onChange={(e) => setForm({ ...form, welcomeMessage: e.target.value })}
            />
          </div>

          {canWrite && (
            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Salvar configurações online
              </Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

