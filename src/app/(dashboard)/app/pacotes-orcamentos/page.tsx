import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/tenant/context";
import { hasPermission } from "@/lib/permissions/evaluator";
import { getPackagesAndBudgetsData } from "@/modules/packages-budgets/service";
import { listClients } from "@/modules/clients/service";
import { listServices } from "@/modules/services/service";
import { listProducts } from "@/modules/products/service";
import { getFinancialWorkspaceData } from "@/modules/financial/service";
import { PackagesBudgetsHub } from "@/components/packages-budgets/packages-budgets-hub";

export default async function PackagesAndBudgetsPage() {
  let ctx;
  try {
    ctx = await requirePermission("clients:read");
  } catch {
    redirect("/app");
  }

  const [data, clientRows, svcRows, prodRows, finData] = await Promise.all([
    getPackagesAndBudgetsData(ctx.organizationId),
    listClients(ctx.organizationId, { status: "active" }),
    listServices(ctx.organizationId),
    listProducts(ctx.organizationId),
    getFinancialWorkspaceData(ctx.organizationId),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#142B4F]">
          Pacotes e Orçamentos
        </h1>
        <p className="text-sm text-[#64748B]">
          Controle sessões contratadas com alertas de vencimento e converta orçamentos aprovados diretamente em vendas.
        </p>
      </div>

      <PackagesBudgetsHub
        organizationName={ctx.organizationName}
        packages={data.packages}
        budgets={data.budgets}
        clients={clientRows.map((c) => ({ id: c.id, name: c.name }))}
        services={svcRows
          .filter((s) => s.status === "active")
          .map((s) => ({ id: s.id, name: s.name, priceCents: s.priceCents }))}
        products={prodRows
          .filter((p) => p.status === "active")
          .map((p) => ({ id: p.id, name: p.name, priceCents: p.priceCents }))}
        accounts={finData.accounts.map((a) => ({ id: a.id, name: a.name }))}
        canWrite={hasPermission(ctx.permissions, "clients:write")}
        canConvertSale={hasPermission(ctx.permissions, "financial:write")}
      />
    </div>
  );
}

