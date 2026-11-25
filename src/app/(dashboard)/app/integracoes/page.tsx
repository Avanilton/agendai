import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/tenant/context";
import { hasPermission } from "@/lib/permissions/evaluator";
import { getIntegrationsWorkspaceData } from "@/modules/integrations/service";
import { listClients } from "@/modules/clients/service";
import { IntegrationsHub } from "@/components/integrations/integrations-hub";

export default async function IntegrationsPage() {
  let ctx;
  try {
    ctx = await requirePermission("financial:read");
  } catch {
    redirect("/app");
  }

  const [data, clientRows] = await Promise.all([
    getIntegrationsWorkspaceData(ctx.organizationId),
    listClients(ctx.organizationId, { status: "active" }),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#142B4F]">
          Integrações (Pix e NFS-e)
        </h1>
        <p className="text-sm text-[#64748B]">
          Cobranças Pix Copia e Cola no padrão BACEN e preparação fiscal segura para emissão de NFS-e.
        </p>
      </div>

      <IntegrationsHub
        organizationName={ctx.organizationName}
        pixCharges={data.pixCharges}
        fiscalProfile={data.fiscalProfile}
        invoices={data.invoices}
        clients={clientRows.map((c) => ({ id: c.id, name: c.name }))}
        canWriteFinancial={hasPermission(ctx.permissions, "financial:write")}
        canManageSettings={hasPermission(ctx.permissions, "settings:manage")}
      />
    </div>
  );
}

