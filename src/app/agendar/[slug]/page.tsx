import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AgendaiLogo } from "@/components/brand/agendai-logo";
import { getPublicOrganizationProfile } from "@/modules/booking/service";
import { PublicBookingWizard } from "@/components/booking/public-booking-wizard";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getPublicOrganizationProfile(slug);
  if (!profile) {
    return { title: "Agendamento não encontrado" };
  }
  return {
    title: `Agendar em ${profile.organization.name}`,
    description: `Agende seu horário online em ${profile.organization.name} (${profile.organization.segment}) pelo Agendai.`,
  };
}

export default async function PublicBookingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const profile = await getPublicOrganizationProfile(slug);

  if (!profile) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] pb-16">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <Link href="/">
            <AgendaiLogo size="sm" />
          </Link>
          <span className="text-xs font-medium text-[#64748B]">
            Agendamento Online Seguro
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 pt-8">
        {!profile.settings.isEnabled ? (
          <Card className="mx-auto max-w-lg text-center">
            <CardContent className="p-8 space-y-2">
              <h1 className="text-xl font-bold text-[#142B4F]">
                {profile.organization.name}
              </h1>
              <p className="text-sm text-[#64748B]">
                O agendamento online está temporariamente desativado por esta
                empresa. Entre em contato diretamente pelo telefone{" "}
                {profile.organization.phone || "informado pelo estabelecimento"}.
              </p>
            </CardContent>
          </Card>
        ) : (
          <PublicBookingWizard
            organization={profile.organization}
            settings={profile.settings}
            services={profile.services}
            professionals={profile.professionals}
          />
        )}
      </main>
    </div>
  );
}

