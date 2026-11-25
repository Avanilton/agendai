"use client";

import { useRouter } from "next/navigation";
import { Building2, ShieldAlert, Users, Activity } from "lucide-react";
import { toast } from "sonner";
import { adminToggleOrganizationStatusAction } from "@/modules/integrations/actions";
import { formatCurrencyBRL } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface GlobalAdminPanelProps {
  adminEmail: string;
  metrics: {
    organizations: number;
    users: number;
    auditEvents: number;
  };
  organizations: {
    id: string;
    name: string;
    slug: string;
    segment: string;
    status: string;
    planName: string | null;
    createdAtIso: string;
  }[];
  plans: {
    id: string;
    name: string;
    priceCents: number;
    maxProfessionals: number;
    storageLimitMb: number;
    isPopular: boolean;
  }[];
}

export function GlobalAdminPanel({
  adminEmail,
  metrics,
  organizations,
  plans,
}: GlobalAdminPanelProps) {
  const router = useRouter();

  async function handleToggle(orgId: string, currentStatus: string) {
    const nextStatus = currentStatus === "suspended" ? "active" : "suspended";
    const res = await adminToggleOrganizationStatusAction(orgId, nextStatus);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    toast.success(
      nextStatus === "active" ? "Empresa ativada." : "Empresa suspensa."
    );
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <Badge variant="dark">Administração Global SaaS</Badge>
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-extrabold text-[#142B4F]">
            <ShieldAlert className="h-6 w-6 text-[#FF914D]" />
            Painel Global Agendai
          </h1>
          <p className="text-xs text-[#64748B]">
            Administrador autenticado: <strong>{adminEmail}</strong>
          </p>
        </div>
      </div>

      {/* Global Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs text-[#64748B]">Empresas cadastradas</p>
              <p className="mt-1 text-3xl font-extrabold text-[#142B4F]">
                {metrics.organizations}
              </p>
            </div>
            <Building2 className="h-8 w-8 text-[#2563EB]" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs text-[#64748B]">Usuários na plataforma</p>
              <p className="mt-1 text-3xl font-extrabold text-[#142B4F]">
                {metrics.users}
              </p>
            </div>
            <Users className="h-8 w-8 text-[#FF914D]" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs text-[#64748B]">Eventos de auditoria</p>
              <p className="mt-1 text-3xl font-extrabold text-[#142B4F]">
                {metrics.auditEvents}
              </p>
            </div>
            <Activity className="h-8 w-8 text-emerald-600" />
          </CardContent>
        </Card>
      </div>

      {/* Organizations Management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Empresas (Tenants)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {organizations.map((org) => (
            <div
              key={org.id}
              className="flex flex-col justify-between gap-2 rounded-xl border border-slate-200 px-4 py-3 sm:flex-row sm:items-center"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold text-sm text-[#142B4F]">{org.name}</p>
                  <Badge
                    variant={
                      org.status === "suspended"
                        ? "destructive"
                        : org.status === "active"
                          ? "success"
                          : "default"
                    }
                  >
                    {org.status}
                  </Badge>
                  {org.planName && <Badge variant="outline">{org.planName}</Badge>}
                </div>
                <p className="text-xs text-[#64748B]">
                  /{org.slug} • {org.segment}
                </p>
              </div>

              <Button
                size="sm"
                variant={org.status === "suspended" ? "secondary" : "destructive"}
                onClick={() => handleToggle(org.id, org.status)}
              >
                {org.status === "suspended" ? "Reativar" : "Suspender"}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Plans Matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Planos Comerciais Configurados</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((p) => (
            <div key={p.id} className="rounded-xl bg-[#F5F7FA] p-4 text-xs">
              <div className="flex items-center justify-between">
                <strong className="text-sm text-[#142B4F]">{p.name}</strong>
                {p.isPopular && <Badge variant="solidOrange">Popular</Badge>}
              </div>
              <p className="mt-2 text-lg font-extrabold text-[#2563EB]">
                {formatCurrencyBRL(p.priceCents)}/mês
              </p>
              <p className="mt-1 text-[#64748B]">
                {p.maxProfessionals} prof. • {(p.storageLimitMb / 1024).toFixed(0)} GB
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

