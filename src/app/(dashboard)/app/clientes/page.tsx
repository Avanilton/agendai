import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/tenant/context";
import { hasPermission } from "@/lib/permissions/evaluator";
import { listClients } from "@/modules/clients/service";
import { ClientsManager } from "@/components/cadastros/clients-manager";

export default async function ClientsPage() {
  let ctx;
  try {
    ctx = await requirePermission("clients:read");
  } catch {
    redirect("/app");
  }

  const rows = await listClients(ctx.organizationId);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#142B4F]">Clientes</h1>
        <p className="text-sm text-[#64748B]">
          Base de clientes da empresa {ctx.organizationName} ({rows.length} registros).
        </p>
      </div>

      <ClientsManager
        initialClients={rows}
        canWrite={hasPermission(ctx.permissions, "clients:write")}
        canDelete={hasPermission(ctx.permissions, "clients:delete")}
      />
    </div>
  );
}

