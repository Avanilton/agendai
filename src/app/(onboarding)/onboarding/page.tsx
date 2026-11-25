import { redirect } from "next/navigation";
import Link from "next/link";
import { AgendaiLogo } from "@/components/brand/agendai-logo";
import { OnboardingForm } from "@/components/auth/onboarding-form";
import { getActivePlans } from "@/modules/organizations/service";
import {
  getAuthenticatedSession,
  requireTenantContext,
} from "@/lib/tenant/context";

export const dynamic = "force-dynamic";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ plano?: string }>;
}) {
  const sessionData = await getAuthenticatedSession();
  if (!sessionData?.user) {
    redirect("/login");
  }

  // If user already belongs to an active organization, redirect to /app
  try {
    await requireTenantContext();
    redirect("/app");
  } catch {
    // No organization yet — continue to onboarding
  }

  const params = await searchParams;
  const plans = await getActivePlans();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F5F7FA] px-4 py-10">
      <Link href="/" className="mb-8">
        <AgendaiLogo size="lg" />
      </Link>
      <OnboardingForm
        plans={plans}
        defaultPlanSlug={params.plano || "profissional"}
        userName={sessionData.user.name}
      />
    </div>
  );
}

