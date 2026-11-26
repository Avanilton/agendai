import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@/lib/tenant/context";
import { hasPermission } from "@/lib/permissions/evaluator";
import { getClientFullProfile } from "@/modules/clients/profile-service";
import { ClientDetailView } from "@/components/cadastros/client-detail-view";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  let ctx;
  try {
    ctx = await requirePermission("clients:read");
  } catch {
    redirect("/app");
  }

  const { id } = await params;

  let profile;
  try {
    profile = await getClientFullProfile({
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      clientId: id,
      canReadAppointments: hasPermission(ctx.permissions, "appointments:read"),
      canReadRecords: hasPermission(ctx.permissions, "medical_records:read"),
      canReadFinancial: hasPermission(ctx.permissions, "financial:read"),
    });
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto max-w-6xl">
      <ClientDetailView
        profile={profile}
        organizationName={ctx.organizationName}
        canWriteClients={hasPermission(ctx.permissions, "clients:write")}
      />
    </div>
  );
}

