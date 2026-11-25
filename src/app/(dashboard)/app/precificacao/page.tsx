import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/tenant/context";
import { hasPermission } from "@/lib/permissions/evaluator";
import { getPricingWorkspaceData } from "@/modules/reports/pricing-service";
import { PricingCalculator } from "@/components/reports/pricing-calculator";

export default async function PricingCalculatorPage() {
  let ctx;
  try {
    ctx = await requirePermission("reports:read");
  } catch {
    redirect("/app");
  }

  const data = await getPricingWorkspaceData(ctx.organizationId);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#142B4F]">
          Criador de Preços
        </h1>
        <p className="text-sm text-[#64748B]">
          Crie e salve preços por serviço ou por produto com custo real, margem líquida e histórico gravado.
        </p>
      </div>

      <PricingCalculator
        initialSavedItems={data.savedCalculations}
        services={data.services}
        products={data.products}
        canUpdateServices={hasPermission(ctx.permissions, "services:write")}
        canUpdateProducts={hasPermission(ctx.permissions, "inventory:write")}
      />
    </div>
  );
}
