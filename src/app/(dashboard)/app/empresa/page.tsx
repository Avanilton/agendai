import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/tenant/context";
import { hasPermission } from "@/lib/permissions/evaluator";
import { getOrganizationById } from "@/modules/organizations/service";
import { getOrganizationPlanUsage } from "@/lib/plans/limits";
import { OrganizationForm } from "@/components/cadastros/organization-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function OrganizationPage() {
  let ctx;
  try {
    ctx = await requirePermission("settings:read");
  } catch {
    redirect("/app");
  }

  const [org, usage] = await Promise.all([
    getOrganizationById(ctx.organizationId),
    getOrganizationPlanUsage(ctx.organizationId),
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
        <CardContent className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
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
        </CardContent>
      </Card>
    </div>
  );
}

