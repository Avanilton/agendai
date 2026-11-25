import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/tenant/context";
import { hasPermission } from "@/lib/permissions/evaluator";
import {
  listInventoryMovements,
  listPurchases,
} from "@/modules/commerce/service";
import { listProducts } from "@/modules/products/service";
import { listSuppliers } from "@/modules/suppliers/service";
import { getFinancialWorkspaceData } from "@/modules/financial/service";
import { InventoryHub } from "@/components/commerce/inventory-hub";

export default async function InventoryPage() {
  let ctx;
  try {
    ctx = await requirePermission("inventory:read");
  } catch {
    redirect("/app");
  }

  const [prodRows, supRows, movRows, purRows, finData] = await Promise.all([
    listProducts(ctx.organizationId),
    listSuppliers(ctx.organizationId),
    listInventoryMovements(ctx.organizationId),
    listPurchases(ctx.organizationId),
    getFinancialWorkspaceData(ctx.organizationId),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#142B4F]">
          Estoque e Compras
        </h1>
        <p className="text-sm text-[#64748B]">
          Movimentações rastreáveis de inventário, alertas de estoque mínimo e compras de fornecedores.
        </p>
      </div>

      <InventoryHub
        products={prodRows.map((p) => ({
          id: p.id,
          name: p.name,
          stockQuantity: p.stockQuantity,
          minStockQuantity: p.minStockQuantity,
          costCents: p.costCents,
        }))}
        suppliers={supRows.map((s) => ({ id: s.id, name: s.name }))}
        accounts={finData.accounts.map((a) => ({ id: a.id, name: a.name }))}
        movements={movRows.map((m) => ({
          id: m.id,
          productName: m.productName,
          type: m.type,
          quantityDelta: m.quantityDelta,
          previousQuantity: m.previousQuantity,
          newQuantity: m.newQuantity,
          reason: m.reason,
          createdAtIso: m.createdAt.toISOString(),
        }))}
        purchases={purRows.map((p) => ({
          id: p.id,
          supplierName: p.supplierName,
          totalCents: p.totalCents,
          paymentMethod: p.paymentMethod,
          status: p.status,
          receivedAtIso: p.receivedAt.toISOString(),
        }))}
        canWrite={hasPermission(ctx.permissions, "inventory:write")}
      />
    </div>
  );
}

