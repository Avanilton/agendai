import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/tenant/context";
import { hasPermission } from "@/lib/permissions/evaluator";
import { listSubscriptionPlans } from "@/modules/subscriptions/service";
import { listServices } from "@/modules/services/service";
import { listProducts } from "@/modules/products/service";
import { SubscriptionsManager } from "@/components/subscriptions/subscriptions-manager";

export default async function SubscriptionPlansPage() {
  let ctx;
  try {
    ctx = await requirePermission("services:read");
  } catch {
    redirect("/app");
  }

  const [plans, serviceRows, productRows] = await Promise.all([
    listSubscriptionPlans(ctx.organizationId),
    listServices(ctx.organizationId),
    listProducts(ctx.organizationId),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#142B4F]">
          Planos de Assinatura
        </h1>
        <p className="text-sm text-[#64748B]">
          Crie planos recorrentes com serviços e produtos inclusos, forma de pagamento e dia fixo de vencimento para vincular aos seus clientes.
        </p>
      </div>

      <SubscriptionsManager
        initialPlans={plans}
        services={serviceRows
          .filter((s) => s.status === "active")
          .map((s) => ({ id: s.id, name: s.name, priceCents: s.priceCents }))}
        products={productRows
          .filter((p) => p.status === "active")
          .map((p) => ({ id: p.id, name: p.name, priceCents: p.priceCents }))}
        canWrite={hasPermission(ctx.permissions, "services:write")}
      />
    </div>
  );
}

