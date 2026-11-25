import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/tenant/context";
import { hasPermission } from "@/lib/permissions/evaluator";
import { getExecutiveReportsData } from "@/modules/reports/service";
import { ReportsHub } from "@/components/reports/reports-hub";

export default async function ReportsPage() {
  let ctx;
  try {
    ctx = await requirePermission("reports:read");
  } catch {
    redirect("/app");
  }

  const data = await getExecutiveReportsData(ctx.organizationId);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#142B4F]">
          Relatórios e Exportações
        </h1>
        <p className="text-sm text-[#64748B]">
          Indicadores gerenciais em tempo real, exportação Excel/CSV, impressão em PDF e importação validada.
        </p>
      </div>

      <ReportsHub
        data={data}
        canExport={hasPermission(ctx.permissions, "reports:export")}
        canImportClients={hasPermission(ctx.permissions, "clients:write")}
      />
    </div>
  );
}

