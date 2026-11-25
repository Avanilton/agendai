import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/tenant/context";
import { hasPermission } from "@/lib/permissions/evaluator";
import { listServices } from "@/modules/services/service";
import { listProfessionals } from "@/modules/professionals/service";
import { ServicesManager } from "@/components/cadastros/services-manager";

export default async function ServicesPage() {
  let ctx;
  try {
    ctx = await requirePermission("services:read");
  } catch {
    redirect("/app");
  }

  const [serviceRows, profRows] = await Promise.all([
    listServices(ctx.organizationId),
    listProfessionals(ctx.organizationId),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#142B4F]">Serviços</h1>
        <p className="text-sm text-[#64748B]">
          Catálogo de procedimentos e serviços com preço, duração e profissionais habilitados.
        </p>
      </div>

      <ServicesManager
        initialServices={serviceRows}
        professionals={profRows.map((p) => ({ id: p.id, name: p.name }))}
        canWrite={hasPermission(ctx.permissions, "services:write")}
      />
    </div>
  );
}

