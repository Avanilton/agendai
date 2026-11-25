import { redirect } from "next/navigation";
import { requireTenantContext } from "@/lib/tenant/context";
import { ALLOWED_HOME_ROUTES } from "@/modules/settings/constants";

export const dynamic = "force-dynamic";

export default async function DefaultHomeRedirectPage() {
  const ctx = await requireTenantContext();
  const target = ALLOWED_HOME_ROUTES.includes(ctx.userDefaultHomeRoute)
    ? ctx.userDefaultHomeRoute
    : "/app";
  redirect(target);
}

