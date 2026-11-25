import { redirect } from "next/navigation";
import {
  AuthorizationError,
  getAuthenticatedSession,
  requireTenantContext,
} from "@/lib/tenant/context";
import { AppShell } from "@/components/layout/app-shell";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessionData = await getAuthenticatedSession();
  if (!sessionData?.user) {
    redirect("/login");
  }

  let tenantCtx;
  try {
    tenantCtx = await requireTenantContext();
  } catch (error) {
    if (error instanceof AuthorizationError && error.statusCode === 401) {
      redirect("/login");
    }
    redirect("/onboarding");
  }

  return (
    <AppShell
      user={{
        name: tenantCtx.userName,
        email: tenantCtx.userEmail,
        image: tenantCtx.userImage,
        theme: tenantCtx.userTheme,
        roleName: tenantCtx.roleName,
        organizationName: tenantCtx.organizationName,
        organizationSlug: tenantCtx.organizationSlug,
        permissions: Array.from(tenantCtx.permissions),
      }}
    >
      {children}
    </AppShell>
  );
}

