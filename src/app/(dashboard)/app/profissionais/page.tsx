import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/tenant/context";
import { hasPermission } from "@/lib/permissions/evaluator";
import { listProfessionals } from "@/modules/professionals/service";
import { getOrganizationPlanUsage } from "@/lib/plans/limits";
import { ProfessionalsManager } from "@/components/cadastros/professionals-manager";

export default async function ProfessionalsPage() {
  let ctx;
  try {
    ctx = await requirePermission("team:read");
  } catch {
    redirect("/app");
  }

  const [rows, usage] = await Promise.all([
    listProfessionals(ctx.organizationId),
    getOrganizationPlanUsage(ctx.organizationId),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#142B4F]">Profissionais</h1>
        <p className="text-sm text-[#64748B]">
          Equipe de atendimento, especialidades, comissões e controle de limite do plano.
        </p>
      </div>

      <ProfessionalsManager
        initialProfessionals={rows}
        planUsage={usage}
        canManage={hasPermission(ctx.permissions, "team:manage")}
      />
    </div>
  );
}

