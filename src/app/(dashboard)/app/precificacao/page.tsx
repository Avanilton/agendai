import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/tenant/context";
import { PricingCalculator } from "@/components/reports/pricing-calculator";

export default async function PricingCalculatorPage() {
  try {
    await requirePermission("reports:read");
  } catch {
    redirect("/app");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#142B4F]">
          Criador de Preços
        </h1>
        <p className="text-sm text-[#64748B]">
          Calcule preço mínimo, preço recomendado, lucro real e simule cenários de faturamento mensal.
        </p>
      </div>

      <PricingCalculator />
    </div>
  );
}

