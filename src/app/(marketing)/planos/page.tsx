import type { Metadata } from "next";
import { getActivePlans } from "@/modules/organizations/service";
import { PricingGrid } from "@/components/marketing/pricing-grid";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Planos e Preços",
  description:
    "Conheça os planos Individual, Equipe, Profissional e Negócio do Agendai. Sem limite de registros operacionais.",
};

export default async function PricingPage() {
  const plans = await getActivePlans();

  return (
    <div className="bg-[#F5F7FA] py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <Badge variant="orange">Planos Transparentes</Badge>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-[#142B4F] sm:text-5xl">
            Planos que acompanham o crescimento do seu negócio
          </h1>
          <p className="mt-4 text-lg text-[#64748B]">
            Comece gratuitamente sem limite de clientes ou agendamentos. Todos
            os recursos essenciais inclusos em qualquer plano.
          </p>
        </div>

        <PricingGrid plans={plans} />

        <div className="mt-20">
          <h2 className="mb-8 text-center text-2xl font-extrabold text-[#142B4F]">
            Dúvidas sobre planos e contratação
          </h2>
          <FaqAccordion />
        </div>
      </div>
    </div>
  );
}

