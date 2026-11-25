import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/tenant/context";
import { hasPermission } from "@/lib/permissions/evaluator";
import { listSales } from "@/modules/commerce/service";
import { listClients } from "@/modules/clients/service";
import { listProfessionals } from "@/modules/professionals/service";
import { listProducts } from "@/modules/products/service";
import { listServices } from "@/modules/services/service";
import { getFinancialWorkspaceData } from "@/modules/financial/service";
import { SalesManager } from "@/components/commerce/sales-manager";

export default async function SalesPage() {
  let ctx;
  try {
    ctx = await requirePermission("financial:read");
  } catch {
    redirect("/app");
  }

  const [saleRows, clientRows, profRows, prodRows, svcRows, finData] =
    await Promise.all([
      listSales(ctx.organizationId),
      listClients(ctx.organizationId, { status: "active" }),
      listProfessionals(ctx.organizationId),
      listProducts(ctx.organizationId),
      listServices(ctx.organizationId),
      getFinancialWorkspaceData(ctx.organizationId),
    ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#142B4F]">Vendas</h1>
        <p className="text-sm text-[#64748B]">
          Registre vendas de produtos e serviços com baixa automática de estoque e lançamento no financeiro.
        </p>
      </div>

      <SalesManager
        initialSales={saleRows.map((s) => ({
          ...s,
          createdAtIso: s.createdAt.toISOString(),
        }))}
        clients={clientRows.map((c) => ({ id: c.id, name: c.name }))}
        professionals={profRows
          .filter((p) => p.status === "active")
          .map((p) => ({ id: p.id, name: p.name }))}
        products={prodRows
          .filter((p) => p.status === "active")
          .map((p) => ({
            id: p.id,
            name: p.name,
            priceCents: p.priceCents,
            stockQuantity: p.stockQuantity,
          }))}
        services={svcRows
          .filter((s) => s.status === "active")
          .map((s) => ({
            id: s.id,
            name: s.name,
            priceCents: s.priceCents,
          }))}
        accounts={finData.accounts.map((a) => ({ id: a.id, name: a.name }))}
        canWrite={hasPermission(ctx.permissions, "financial:write")}
      />
    </div>
  );
}

