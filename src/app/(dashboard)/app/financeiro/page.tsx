import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/tenant/context";
import { hasPermission } from "@/lib/permissions/evaluator";
import { getFinancialWorkspaceData } from "@/modules/financial/service";
import { listClients } from "@/modules/clients/service";
import { listSuppliers } from "@/modules/suppliers/service";
import { FinancialHub } from "@/components/financial/financial-hub";

export default async function FinancialPage() {
  let ctx;
  try {
    ctx = await requirePermission("financial:read");
  } catch {
    redirect("/app");
  }

  const [workspace, clientRows, supplierRows] = await Promise.all([
    getFinancialWorkspaceData(ctx.organizationId),
    listClients(ctx.organizationId),
    listSuppliers(ctx.organizationId),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#142B4F]">Financeiro</h1>
        <p className="text-sm text-[#64748B]">
          Contas a pagar, contas a receber, fluxo de caixa, parcelamentos e saldos por conta.
        </p>
      </div>

      <FinancialHub
        accounts={workspace.accounts}
        categories={workspace.categories}
        costCenters={workspace.costCenters}
        transactions={workspace.transactions}
        clients={clientRows.map((c) => ({ id: c.id, name: c.name }))}
        suppliers={supplierRows.map((s) => ({ id: s.id, name: s.name }))}
        canWrite={hasPermission(ctx.permissions, "financial:write")}
      />
    </div>
  );
}

