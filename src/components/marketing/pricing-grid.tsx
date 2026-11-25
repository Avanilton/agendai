import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import type { PlanCatalogItem } from "@/db/plans-catalog";
import { formatCurrencyBRL, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PricingGridProps {
  plans: PlanCatalogItem[];
}

export function PricingGrid({ plans }: PricingGridProps) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
      {plans.map((plan) => {
        const storageGb = (plan.storageLimitMb / 1024).toFixed(0);
        return (
          <div
            key={plan.slug}
            className={cn(
              "relative flex flex-col rounded-2xl border bg-white p-6 transition-all",
              plan.isPopular
                ? "border-[#2563EB] ring-2 ring-[#2563EB]/20 shadow-xl shadow-blue-900/10 scale-[1.01]"
                : "border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md"
            )}
          >
            {plan.isPopular && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <Badge variant="solidOrange" className="px-3.5 py-1 shadow-sm">
                  <Sparkles className="h-3.5 w-3.5" />
                  {plan.badgeText ?? "MAIS ESCOLHIDO"}
                </Badge>
              </div>
            )}

            <div className="mb-5 pt-1">
              <h3 className="text-xl font-bold text-[#142B4F]">{plan.name}</h3>
              <p className="mt-1.5 text-sm text-[#64748B] min-h-[40px]">
                {plan.description}
              </p>
            </div>

            <div className="mb-6 rounded-xl bg-[#F5F7FA] p-4">
              <div className="flex items-center gap-2 text-xs text-[#64748B]">
                <span>De</span>
                <span className="line-through">
                  {formatCurrencyBRL(plan.referencePriceCents)}
                </span>
                <Badge variant="orange" className="px-2 py-0.5 text-[10px]">
                  Promocional
                </Badge>
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold tracking-tight text-[#142B4F]">
                  {formatCurrencyBRL(plan.priceCents)}
                </span>
                <span className="text-sm font-medium text-[#64748B]">/mês</span>
              </div>
              <p className="mt-2 text-xs font-medium text-[#2563EB]">
                {plan.maxProfessionals === 1
                  ? "1 profissional incluso"
                  : `Até ${plan.maxProfessionals} profissionais`}{" "}
                • {storageGb} GB de armazenamento
              </p>
            </div>

            <ul className="mb-8 flex-1 space-y-2.5 text-sm text-[#142B4F]">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#EAF2FF] text-[#2563EB]">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <span className="leading-snug text-slate-700">{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              variant={plan.isPopular ? "default" : "outline"}
              size="lg"
              className="w-full"
              asChild
            >
              <Link href={`/cadastro?plano=${plan.slug}`}>
                Começar gratuitamente
              </Link>
            </Button>
          </div>
        );
      })}
    </div>
  );
}

