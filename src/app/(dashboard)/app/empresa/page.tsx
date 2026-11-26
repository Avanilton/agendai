import { ExternalLink } from "lucide-react";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/tenant/context";
import { hasPermission } from "@/lib/permissions/evaluator";
import {
  getActivePlans,
  getOrganizationById,
} from "@/modules/organizations/service";
import { getOrganizationPlanUsage } from "@/lib/plans/limits";
import { OrganizationForm } from "@/components/cadastros/organization-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function OrganizationPage() {
  let ctx;
  try {
    ctx = await requirePermission("settings:read");
  } catch {
    redirect("/app");
  }

  const [org, usage, activePlans] = await Promise.all([
    getOrganizationById(ctx.organizationId),
    getOrganizationPlanUsage(ctx.organizationId),
    getActivePlans(),
  ]);

  if (!org) redirect("/app");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-[#142B4F]">Empresa</h1>
          <p className="text-sm text-[#64748B]">
            Gerencie os dados cadastrais, fuso horário e assinatura da sua organização.
          </p>
        </div>
        <Badge variant="default">
          Plano {usage.planName} • {usage.activeProfessionals}/{usage.maxProfessionals} profissionais
        </Badge>
      </div>

      <OrganizationForm
        organization={org}
        canManage={hasPermission(ctx.permissions, "settings:manage")}
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Resumo da Assinatura</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
            <div className="rounded-xl bg-[#F5F7FA] p-3">
              <p className="text-xs text-[#64748B]">Plano atual</p>
              <p className="mt-1 font-bold text-[#142B4F]">{usage.planName}</p>
            </div>
            <div className="rounded-xl bg-[#F5F7FA] p-3">
              <p className="text-xs text-[#64748B]">Profissionais ativos</p>
              <p className="mt-1 font-bold text-[#142B4F]">
                {usage.activeProfessionals} de {usage.maxProfessionals}
              </p>
            </div>
            <div className="rounded-xl bg-[#F5F7FA] p-3">
              <p className="text-xs text-[#64748B]">Status da conta</p>
              <p className="mt-1 font-bold capitalize text-emerald-700">{org.status}</p>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3">
            <p className="mb-2 text-xs font-semibold text-[#64748B]">
              Assinar ou fazer upgrade via Mercado Pago:
            </p>
            <div className="flex flex-wrap gap-2">
              {activePlans.map((p) => (
                <Button key={p.slug} size="sm" variant="outline" asChild>
                  <a
                    href={p.paymentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    {p.name}
                  </a>
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

