import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/tenant/context";
import { hasPermission } from "@/lib/permissions/evaluator";
import { listProducts } from "@/modules/products/service";
import { listSuppliers } from "@/modules/suppliers/service";
import { ProductsManager } from "@/components/cadastros/products-manager";

export default async function ProductsPage() {
  let ctx;
  try {
    ctx = await requirePermission("inventory:read");
  } catch {
    redirect("/app");
  }

  const [productRows, supplierRows] = await Promise.all([
    listProducts(ctx.organizationId),
    listSuppliers(ctx.organizationId),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#142B4F]">Produtos</h1>
        <p className="text-sm text-[#64748B]">
          Catálogo de produtos, custo, margem de lucro, fornecedor e alertas de estoque mínimo.
        </p>
      </div>

      <ProductsManager
        initialProducts={productRows}
        suppliers={supplierRows.map((s) => ({ id: s.id, name: s.name }))}
        canWrite={hasPermission(ctx.permissions, "inventory:write")}
      />
    </div>
  );
}

