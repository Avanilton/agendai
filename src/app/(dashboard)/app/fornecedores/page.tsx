import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/tenant/context";
import { hasPermission } from "@/lib/permissions/evaluator";
import { listSuppliers } from "@/modules/suppliers/service";
import { SuppliersManager } from "@/components/cadastros/suppliers-manager";

export default async function SuppliersPage() {
  let ctx;
  try {
    ctx = await requirePermission("inventory:read");
  } catch {
    redirect("/app");
  }

  const rows = await listSuppliers(ctx.organizationId);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#142B4F]">Fornecedores</h1>
        <p className="text-sm text-[#64748B]">
          Cadastro de fornecedores de produtos, materiais e insumos da empresa.
        </p>
      </div>

      <SuppliersManager
        initialSuppliers={rows}
        canWrite={hasPermission(ctx.permissions, "inventory:write")}
      />
    </div>
  );
}

