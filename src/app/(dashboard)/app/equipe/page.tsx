import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/tenant/context";
import { hasPermission } from "@/lib/permissions/evaluator";
import { getTeamWorkspaceData } from "@/modules/team/service";
import { listProfessionals } from "@/modules/professionals/service";
import { getFinancialWorkspaceData } from "@/modules/financial/service";
import { TeamCommissionsHub } from "@/components/team/team-commissions-hub";

export default async function TeamCommissionsPage() {
  let ctx;
  try {
    ctx = await requirePermission("team:read");
  } catch {
    redirect("/app");
  }

  const [teamData, profRows, finData] = await Promise.all([
    getTeamWorkspaceData(ctx.organizationId),
    listProfessionals(ctx.organizationId),
    getFinancialWorkspaceData(ctx.organizationId),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#142B4F]">
          Equipe e Comissões
        </h1>
        <p className="text-sm text-[#64748B]">
          Gestão de comissões sobre serviços/vendas, pagamento integrado ao financeiro, horas, faltas e metas.
        </p>
      </div>

      <TeamCommissionsHub
        commissions={teamData.commissions}
        timeEntries={teamData.timeEntries}
        goals={teamData.goals}
        professionals={profRows.map((p) => ({
          id: p.id,
          name: p.name,
          defaultCommissionBps: p.defaultCommissionBps,
        }))}
        accounts={finData.accounts.map((a) => ({ id: a.id, name: a.name }))}
        canManageTeam={hasPermission(ctx.permissions, "team:manage")}
        canPayFinancial={hasPermission(ctx.permissions, "financial:write")}
      />
    </div>
  );
}

