import { Suspense } from "react";
import { requireTenantContext } from "@/lib/tenant/context";
import { hasPermission } from "@/lib/permissions/evaluator";
import { getIntegrationsWorkspaceData } from "@/modules/integrations/service";
import { listClients } from "@/modules/clients/service";
import { getPermissionsManagementData } from "@/modules/permissions/service";
import { GeneralSettings } from "@/components/settings/general-settings";

export default async function SettingsPage() {
  const ctx = await requireTenantContext();
  const canReadFinancial = hasPermission(ctx.permissions, "financial:read");
  const canManagePermissions =
    hasPermission(ctx.permissions, "team:manage") ||
    hasPermission(ctx.permissions, "settings:manage");

  let integrationsData = null;
  let clientRows: { id: string; name: string }[] = [];
  let permissionsData = null;

  const tasks: Promise<void>[] = [];

  if (canReadFinancial) {
    tasks.push(
      Promise.all([
        getIntegrationsWorkspaceData(ctx.organizationId),
        listClients(ctx.organizationId, { status: "active" }),
      ]).then(([data, clients]) => {
        integrationsData = data;
        clientRows = clients.map((c) => ({ id: c.id, name: c.name }));
      })
    );
  }

  if (canManagePermissions) {
    tasks.push(
      getPermissionsManagementData(ctx.organizationId).then((data) => {
        permissionsData = data;
      })
    );
  }

  await Promise.all(tasks);

  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-white" />}>
      <GeneralSettings
        user={{
          name: ctx.userName,
          email: ctx.userEmail,
          image: ctx.userImage,
          theme: ctx.userTheme,
          defaultHomeRoute: ctx.userDefaultHomeRoute,
          roleName: ctx.roleName,
          organizationName: ctx.organizationName,
        }}
        integrations={{
          enabled: canReadFinancial,
          data: integrationsData,
          clients: clientRows,
          canWriteFinancial: hasPermission(ctx.permissions, "financial:write"),
          canManageSettings: hasPermission(ctx.permissions, "settings:manage"),
        }}
        exportPermissions={{
          canReadClients: hasPermission(ctx.permissions, "clients:read"),
          canReadFinancial,
          canReadAppointments: hasPermission(ctx.permissions, "appointments:read"),
        }}
        permissionsManagement={{
          enabled: canManagePermissions,
          data: permissionsData,
        }}
      />
    </Suspense>
  );
}

