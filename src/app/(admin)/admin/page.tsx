import { redirect } from "next/navigation";
import {
  AuthorizationError,
  requirePlatformAdmin,
} from "@/lib/tenant/context";
import { getGlobalAdminOverview } from "@/modules/integrations/service";
import { GlobalAdminPanel } from "@/components/admin/global-admin-panel";

export const dynamic = "force-dynamic";

export default async function GlobalAdminPage() {
  let admin;
  try {
    admin = await requirePlatformAdmin();
  } catch (error) {
    if (error instanceof AuthorizationError && error.statusCode === 401) {
      redirect("/login");
    }
    redirect("/app");
  }

  const overview = await getGlobalAdminOverview();

  return (
    <div className="min-h-screen bg-[#F5F7FA] p-4 sm:p-8">
      <GlobalAdminPanel
        adminEmail={admin.email}
        metrics={overview.metrics}
        organizations={overview.organizations}
        plans={overview.plans}
      />
    </div>
  );
}
