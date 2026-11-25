"use client";

import { useState } from "react";
import { Building2, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { BUSINESS_SEGMENTS } from "@/modules/organizations/schemas";
import { updateOrganizationAction } from "@/modules/organizations/actions";
import { slugify } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface OrganizationFormProps {
  organization: {
    name: string;
    slug: string;
    segment: string;
    document: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    timezone: string;
  };
  canManage: boolean;
}

const TIMEZONES = [
  "America/Sao_Paulo",
  "America/Manaus",
  "America/Fortaleza",
  "America/Recife",
  "America/Belem",
  "America/Cuiaba",
  "America/Rio_Branco",
];

export function OrganizationForm({ organization, canManage }: OrganizationFormProps) {
  const [name, setName] = useState(organization.name);
  const [slug, setSlug] = useState(organization.slug);
  const [segment, setSegment] = useState(organization.segment);
  const [document, setDocument] = useState(organization.document ?? "");
  const [phone, setPhone] = useState(organization.phone ?? "");
  const [email, setEmail] = useState(organization.email ?? "");
  const [address, setAddress] = useState(organization.address ?? "");
  const [timezone, setTimezone] = useState(organization.timezone);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canManage) return;
    setSaving(true);
    const result = await updateOrganizationAction({
      name,
      slug,
      segment,
      document,
      phone,
      email,
      address,
      timezone,
    });
    setSaving(false);

    if (!result.success) {
      toast.error(result.error || "Não foi possível salvar os dados.");
      return;
    }
    toast.success("Dados da empresa atualizados com sucesso!");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-[#2563EB]" />
          Dados Cadastrais da Empresa
        </CardTitle>
        <CardDescription>
          Informações exibidas no painel, relatórios e página pública de agendamento online.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da empresa</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!canManage}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="segment">Segmento</Label>
              <select
                id="segment"
                value={segment}
                onChange={(e) => setSegment(e.target.value)}
                disabled={!canManage}
                className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#142B4F] disabled:opacity-60"
              >
                {BUSINESS_SEGMENTS.map((seg) => (
                  <option key={seg} value={seg}>
                    {seg}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="slug">Endereço público (/agendar/...)</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                disabled={!canManage}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="document">CNPJ ou CPF</Label>
              <Input
                id="document"
                placeholder="00.000.000/0001-00"
                value={document}
                onChange={(e) => setDocument(e.target.value)}
                disabled={!canManage}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone / WhatsApp</Label>
              <Input
                id="phone"
                placeholder="(11) 99999-9999"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={!canManage}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail de contato</Label>
              <Input
                id="email"
                type="email"
                placeholder="contato@empresa.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!canManage}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="address">Endereço completo</Label>
              <Input
                id="address"
                placeholder="Rua, número, bairro, cidade - UF"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                disabled={!canManage}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Fuso horário</Label>
              <select
                id="timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                disabled={!canManage}
                className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#142B4F] disabled:opacity-60"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {canManage && (
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saving ? "Salvando..." : "Salvar alterações"}
              </Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

