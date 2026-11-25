"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Calculator, TrendingUp } from "lucide-react";
import { calculateServicePricing } from "@/modules/reports/pricing";
import { formatCurrencyBRL } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function PricingCalculator() {
  const [form, setForm] = useState({
    materialCostReais: 18,
    durationMinutes: 60,
    hourlyLaborCostReais: 45,
    monthlyFixedCostsReais: 4500,
    monthlyBillableHours: 160,
    variableCostReais: 5,
    taxPercent: 6,
    commissionPercent: 20,
    paymentFeePercent: 3.5,
    desiredMarginPercent: 25,
  });

  const result = useMemo(() => calculateServicePricing(form), [form]);

  const scenarios = [20, 40, 80].map((monthlyQty) => ({
    qty: monthlyQty,
    revenue: result.recommendedPriceReais * monthlyQty,
    profit: result.estimatedProfitReais * monthlyQty,
  }));

  function setNum(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: Number(value) || 0 }));
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Inputs */}
      <Card className="lg:col-span-7">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-[#2563EB]" />
            Parâmetros de Custo e Margem
          </CardTitle>
          <CardDescription>
            Ajuste seus custos reais, impostos, comissão e taxas para encontrar o preço ideal.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Custo de materiais / insumos (R$)</Label>
            <Input
              type="number"
              step="0.5"
              min="0"
              value={form.materialCostReais}
              onChange={(e) => setNum("materialCostReais", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Tempo de atendimento (minutos)</Label>
            <Input
              type="number"
              min="5"
              value={form.durationMinutes}
              onChange={(e) => setNum("durationMinutes", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Custo/hora de mão de obra (R$)</Label>
            <Input
              type="number"
              step="1"
              min="0"
              value={form.hourlyLaborCostReais}
              onChange={(e) => setNum("hourlyLaborCostReais", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Custos variáveis extras (R$)</Label>
            <Input
              type="number"
              step="0.5"
              min="0"
              value={form.variableCostReais}
              onChange={(e) => setNum("variableCostReais", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Custos fixos mensais (R$)</Label>
            <Input
              type="number"
              step="50"
              min="0"
              value={form.monthlyFixedCostsReais}
              onChange={(e) => setNum("monthlyFixedCostsReais", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Horas produtivas / mês</Label>
            <Input
              type="number"
              min="1"
              value={form.monthlyBillableHours}
              onChange={(e) => setNum("monthlyBillableHours", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Impostos (%)</Label>
            <Input
              type="number"
              step="0.5"
              min="0"
              max="50"
              value={form.taxPercent}
              onChange={(e) => setNum("taxPercent", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Comissão do profissional (%)</Label>
            <Input
              type="number"
              step="0.5"
              min="0"
              max="80"
              value={form.commissionPercent}
              onChange={(e) => setNum("commissionPercent", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Taxa de cartão / pagamento (%)</Label>
            <Input
              type="number"
              step="0.1"
              min="0"
              max="20"
              value={form.paymentFeePercent}
              onChange={(e) => setNum("paymentFeePercent", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Margem de lucro desejada (%)</Label>
            <Input
              type="number"
              step="1"
              min="0"
              max="80"
              value={form.desiredMarginPercent}
              onChange={(e) => setNum("desiredMarginPercent", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Results & Scenarios */}
      <div className="space-y-4 lg:col-span-5">
        <Card className="bg-[#142B4F] text-white">
          <CardContent className="p-6 space-y-4">
            {!result.isFeasible ? (
              <div className="flex items-start gap-2 text-amber-300 text-sm">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <span>
                  A soma de impostos, comissão, taxas e margem atingiu ou
                  ultrapassou 100%. Reduza os percentuais para simular.
                </span>
              </div>
            ) : (
              <>
                <div>
                  <Badge variant="solidOrange">Preço Recomendado</Badge>
                  <p className="mt-2 text-4xl font-extrabold">
                    {formatCurrencyBRL(Math.round(result.recommendedPriceReais * 100))}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 border-t border-white/15 pt-4 text-xs">
                  <div>
                    <p className="text-slate-300">Custo total unitário</p>
                    <p className="mt-0.5 text-base font-bold">
                      {formatCurrencyBRL(Math.round(result.totalCostReais * 100))}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-300">Preço mínimo (empate)</p>
                    <p className="mt-0.5 text-base font-bold text-amber-300">
                      {formatCurrencyBRL(Math.round(result.minimumPriceReais * 100))}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-300">Lucro por atendimento</p>
                    <p className="mt-0.5 text-base font-bold text-emerald-300">
                      {formatCurrencyBRL(Math.round(result.estimatedProfitReais * 100))}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-300">Margem líquida real</p>
                    <p className="mt-0.5 text-base font-bold text-emerald-300">
                      {result.realMarginPercent.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {result.isFeasible && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-[#2563EB]" />
                Simulador de Cenários Mensais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {scenarios.map((sc) => (
                <div
                  key={sc.qty}
                  className="flex items-center justify-between rounded-xl bg-[#F5F7FA] px-4 py-3 text-xs"
                >
                  <span className="font-bold text-[#142B4F]">
                    {sc.qty} atendimentos/mês
                  </span>
                  <div className="text-right">
                    <p className="font-bold text-[#2563EB]">
                      Fat.: {formatCurrencyBRL(Math.round(sc.revenue * 100))}
                    </p>
                    <p className="font-semibold text-emerald-700">
                      Lucro: {formatCurrencyBRL(Math.round(sc.profit * 100))}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

