import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/tenant/context";
import { hasPermission } from "@/lib/permissions/evaluator";
import { getRecordsWorkspaceData } from "@/modules/records/service";
import { listClients } from "@/modules/clients/service";
import { listProfessionals } from "@/modules/professionals/service";
import { RecordsHub } from "@/components/records/records-hub";

export default async function RecordsPage() {
  let ctx;
  try {
    ctx = await requirePermission("medical_records:read");
  } catch {
    redirect("/app");
  }

  const [data, clientRows, profRows] = await Promise.all([
    getRecordsWorkspaceData({
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
    }),
    listClients(ctx.organizationId, { status: "active" }),
    listProfessionals(ctx.organizationId),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#142B4F]">
          Fichas e Anamnese
        </h1>
        <p className="text-sm text-[#64748B]">
          Fichas personalizáveis, prontuários e anamneses com segregação de dados sensíveis e auditoria LGPD.
        </p>
      </div>

      <RecordsHub
        templates={data.templates}
        records={data.records}
        clients={clientRows.map((c) => ({ id: c.id, name: c.name }))}
        professionals={profRows.map((p) => ({ id: p.id, name: p.name }))}
        canWrite={hasPermission(ctx.permissions, "medical_records:write")}
      />
    </div>
  );
}

