"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { BUSINESS_SEGMENTS } from "@/modules/organizations/schemas";
import { completeOnboardingAction } from "@/modules/organizations/actions";
import type { PlanCatalogItem } from "@/db/plans-catalog";
import { formatCurrencyBRL, slugify, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface OnboardingFormProps {
  plans: PlanCatalogItem[];
  defaultPlanSlug: string;
  userName: string;
}

export function OnboardingForm({
  plans,
  defaultPlanSlug,
  userName,
}: OnboardingFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEditedManually, setSlugEditedManually] = useState(false);
  const [segment, setSegment] = useState<string>(BUSINESS_SEGMENTS[0]);
  const [phone, setPhone] = useState("");
  const [planSlug, setPlanSlug] = useState(
    plans.some((p) => p.slug === defaultPlanSlug)
      ? defaultPlanSlug
      : "profissional"
  );
  const [loading, setLoading] = useState(false);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugEditedManually) {
      setSlug(slugify(value));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const result = await completeOnboardingAction({
      name,
      slug,
      segment,
      phone,
      timezone: "America/Sao_Paulo",
      planSlug,
    });

    if (!result.success) {
      toast.error(result.error || "Não foi possível concluir o onboarding.");
      setLoading(false);
      return;
    }

    toast.success("Empresa configurada com sucesso! Bem-vindo ao Agendai.");
    router.push("/app");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-2xl shadow-lg">
      <CardHeader>
        <Badge className="w-fit">Passo único • Configuração inicial</Badge>
        <CardTitle className="mt-2 text-2xl">
          Olá, {userName.split(" ")[0]}! Vamos configurar sua empresa
        </CardTitle>
        <CardDescription>
          Esses dados criam seu ambiente multi-tenant isolado, seus perfis de
          permissão e o endereço da sua página de agendamento online.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="orgName">Nome da empresa ou profissional</Label>
              <Input
                id="orgName"
                placeholder="Ex.: Clínica Bem Estar"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
                minLength={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="segment">Segmento de atuação</Label>
              <select
                id="segment"
                value={segment}
                onChange={(e) => setSegment(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#142B4F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
              >
                {BUSINESS_SEGMENTS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="slug">Endereço do agendamento online</Label>
              <div className="flex items-center rounded-lg border border-slate-300 bg-white focus-within:ring-2 focus-within:ring-[#2563EB]">
                <span className="pl-3 text-xs text-[#64748B] select-none">
                  /agendar/
                </span>
                <input
                  id="slug"
                  value={slug}
                  onChange={(e) => {
                    setSlugEditedManually(true);
                    setSlug(slugify(e.target.value));
                  }}
                  placeholder="sua-empresa"
                  required
                  minLength={3}
                  className="h-10 w-full bg-transparent px-1.5 text-sm text-[#142B4F] focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">WhatsApp / Telefone (opcional)</Label>
              <Input
                id="phone"
                placeholder="(11) 99999-9999"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2.5">
            <Label>Plano inicial (14 dias gratuitos, sem cobrança agora)</Label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {plans.map((plan) => {
                const selected = plan.slug === planSlug;
                return (
                  <button
                    key={plan.slug}
                    type="button"
                    onClick={() => setPlanSlug(plan.slug)}
                    className={cn(
                      "flex flex-col items-start rounded-xl border p-3.5 text-left transition-all cursor-pointer",
                      selected
                        ? "border-[#2563EB] bg-[#EAF2FF]/60 ring-2 ring-[#2563EB]/20"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    )}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="font-bold text-[#142B4F]">
                        {plan.name}
                      </span>
                      {selected ? (
                        <CheckCircle2 className="h-4 w-4 text-[#2563EB]" />
                      ) : plan.isPopular ? (
                        <Badge variant="solidOrange" className="text-[10px]">
                          Popular
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-[#64748B]">
                      {plan.maxProfessionals === 1
                        ? "1 profissional"
                        : `Até ${plan.maxProfessionals} profissionais`}{" "}
                      • {formatCurrencyBRL(plan.priceCents)}/mês
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Building2 className="h-4 w-4" />
            )}
            {loading ? "Preparando ambiente..." : "Concluir e acessar painel"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

