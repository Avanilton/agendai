"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Calculator,
  Loader2,
  Package,
  RotateCcw,
  Save,
  Scissors,
  Search,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import {
  calculateProductPricing,
  calculateServicePricing,
} from "@/modules/reports/pricing";
import {
  deletePricingCalculationAction,
  savePricingCalculationAction,
} from "@/modules/reports/pricing-actions";
import type { SavedPricingItem } from "@/modules/reports/pricing-service";
import { cn, formatCurrencyBRL } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ServiceOption {
  id: string;
  name: string;
  priceCents: number;
  durationMinutes: number;
  commissionBps: number;
}

interface ProductOption {
  id: string;
  name: string;
  costCents: number;
  priceCents: number;
}

interface PricingCalculatorProps {
  initialSavedItems: SavedPricingItem[];
  services: ServiceOption[];
  products: ProductOption[];
  canUpdateServices: boolean;
  canUpdateProducts: boolean;
}

const DEFAULT_SERVICE_FORM = {
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
};

const DEFAULT_PRODUCT_FORM = {
  purchaseCostReais: 35,
  freightAndPackagingReais: 5,
  variableCostReais: 2,
  fixedCostPerUnitReais: 3,
  taxPercent: 6,
  commissionPercent: 10,
  paymentFeePercent: 3.5,
  desiredMarginPercent: 30,
};

function formatDatePtBr(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function PricingCalculator({
  initialSavedItems,
  services,
  products,
  canUpdateServices,
  canUpdateProducts,
}: PricingCalculatorProps) {
  const [itemType, setItemType] = useState<"service" | "product">("service");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [itemName, setItemName] = useState("");
  const [applyToCatalog, setApplyToCatalog] = useState(false);

  const [serviceForm, setServiceForm] = useState(DEFAULT_SERVICE_FORM);
  const [productForm, setProductForm] = useState(DEFAULT_PRODUCT_FORM);

  const [savedItems, setSavedItems] =
    useState<SavedPricingItem[]>(initialSavedItems);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [listFilter, setListFilter] = useState<"all" | "service" | "product">(
    "all"
  );
  const [search, setSearch] = useState("");

  const result = useMemo(
    () =>
      itemType === "service"
        ? calculateServicePricing(serviceForm)
        : calculateProductPricing(productForm),
    [itemType, serviceForm, productForm]
  );

  const scenarios = [20, 40, 80].map((monthlyQty) => ({
    qty: monthlyQty,
    revenue: result.recommendedPriceReais * monthlyQty,
    profit: result.estimatedProfitReais * monthlyQty,
  }));

  const filteredSavedItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return savedItems.filter((item) => {
      if (listFilter !== "all" && item.itemType !== listFilter) return false;
      if (q && !item.itemName.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [savedItems, listFilter, search]);

  function setServiceNum(key: keyof typeof serviceForm, value: string) {
    setServiceForm((prev) => ({ ...prev, [key]: Number(value) || 0 }));
  }

  function setProductNum(key: keyof typeof productForm, value: string) {
    setProductForm((prev) => ({ ...prev, [key]: Number(value) || 0 }));
  }

  function handleSelectService(id: string) {
    setSelectedServiceId(id);
    const svc = services.find((s) => s.id === id);
    if (svc) {
      setItemName(svc.name);
      setServiceForm((prev) => ({
        ...prev,
        durationMinutes: svc.durationMinutes || prev.durationMinutes,
        commissionPercent:
          svc.commissionBps > 0 ? svc.commissionBps / 100 : prev.commissionPercent,
      }));
    }
  }

  function handleSelectProduct(id: string) {
    setSelectedProductId(id);
    const prod = products.find((p) => p.id === id);
    if (prod) {
      setItemName(prod.name);
      setProductForm((prev) => ({
        ...prev,
        purchaseCostReais:
          prod.costCents > 0 ? prod.costCents / 100 : prev.purchaseCostReais,
      }));
    }
  }

  async function handleSavePrice() {
    if (!itemName.trim()) {
      toast.error(
        itemType === "service"
          ? "Informe ou selecione o nome do serviço antes de gravar."
          : "Informe ou selecione o nome do produto antes de gravar."
      );
      return;
    }

    if (!result.isFeasible) {
      toast.error("Ajuste os percentuais para obter um preço válido.");
      return;
    }

    setSaving(true);
    const res =
      itemType === "service"
        ? await savePricingCalculationAction({
            itemType: "service",
            itemName: itemName.trim(),
            serviceId: selectedServiceId || null,
            applyToCatalog: Boolean(selectedServiceId && applyToCatalog),
            inputs: serviceForm,
          })
        : await savePricingCalculationAction({
            itemType: "product",
            itemName: itemName.trim(),
            productId: selectedProductId || null,
            applyToCatalog: Boolean(selectedProductId && applyToCatalog),
            inputs: productForm,
          });
    setSaving(false);

    if (!res.success) {
      toast.error(res.error);
      return;
    }

    setSavedItems((prev) => [res.item, ...prev]);
    toast.success(
      res.catalogUpdated
        ? "Preço gravado na lista e atualizado no cadastro!"
        : "Preço gravado na lista abaixo!"
    );
  }

  function handleLoadSavedItem(item: SavedPricingItem) {
    setItemType(item.itemType);
    setItemName(item.itemName);
    if (item.itemType === "service") {
      setSelectedServiceId(item.serviceId || "");
      setSelectedProductId("");
      setServiceForm({
        ...DEFAULT_SERVICE_FORM,
        ...(item.inputs as Partial<typeof DEFAULT_SERVICE_FORM>),
      });
    } else {
      setSelectedProductId(item.productId || "");
      setSelectedServiceId("");
      setProductForm({
        ...DEFAULT_PRODUCT_FORM,
        ...(item.inputs as Partial<typeof DEFAULT_PRODUCT_FORM>),
      });
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
    toast.info(`"${item.itemName}" carregado na calculadora.`);
  }

  async function handleDeleteSavedItem(id: string) {
    setDeletingId(id);
    const res = await deletePricingCalculationAction(id);
    setDeletingId(null);

    if (!res.success) {
      toast.error(res.error);
      return;
    }

    setSavedItems((prev) => prev.filter((item) => item.id !== id));
    toast.success("Preço removido da lista.");
  }

  const canApplyCatalog =
    (itemType === "service" && Boolean(selectedServiceId) && canUpdateServices) ||
    (itemType === "product" && Boolean(selectedProductId) && canUpdateProducts);

  return (
    <div className="space-y-8">
      {/* Mode Switcher: Serviço vs Produto */}
      <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1.5">
        <button
          type="button"
          onClick={() => {
            setItemType("service");
            setApplyToCatalog(false);
          }}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors cursor-pointer",
            itemType === "service"
              ? "bg-[#2563EB] text-white shadow-xs"
              : "text-[#64748B] hover:text-[#142B4F]"
          )}
        >
          <Scissors className="h-4 w-4" />
          Precificar Serviço
        </button>
        <button
          type="button"
          onClick={() => {
            setItemType("product");
            setApplyToCatalog(false);
          }}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors cursor-pointer",
            itemType === "product"
              ? "bg-[#2563EB] text-white shadow-xs"
              : "text-[#64748B] hover:text-[#142B4F]"
          )}
        >
          <Package className="h-4 w-4" />
          Precificar Produto
        </button>
      </div>

      {/* Calculator Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Inputs */}
        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-[#2563EB]" />
              {itemType === "service"
                ? "Parâmetros de Custo do Serviço"
                : "Parâmetros de Custo do Produto"}
            </CardTitle>
            <CardDescription>
              {itemType === "service"
                ? "Selecione um serviço cadastrado ou informe um nome, ajuste os custos e grave o preço."
                : "Selecione um produto cadastrado ou informe um nome, ajuste os custos e grave o preço."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {/* Item identification */}
            <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-[#F5F7FA] p-4 sm:grid-cols-2">
              {itemType === "service" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="pricing-service-select">
                    Serviço cadastrado (opcional)
                  </Label>
                  <select
                    id="pricing-service-select"
                    value={selectedServiceId}
                    onChange={(e) => handleSelectService(e.target.value)}
                    className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#142B4F]"
                  >
                    <option value="">Personalizado / novo serviço</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({formatCurrencyBRL(s.priceCents)})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label htmlFor="pricing-product-select">
                    Produto cadastrado (opcional)
                  </Label>
                  <select
                    id="pricing-product-select"
                    value={selectedProductId}
                    onChange={(e) => handleSelectProduct(e.target.value)}
                    className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#142B4F]"
                  >
                    <option value="">Personalizado / novo produto</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Custo: {formatCurrencyBRL(p.costCents)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="pricing-item-name">
                  Nome do {itemType === "service" ? "serviço" : "produto"} *
                </Label>
                <Input
                  id="pricing-item-name"
                  placeholder={
                    itemType === "service"
                      ? "Ex.: Corte + Hidratação"
                      : "Ex.: Shampoo Profissional 300ml"
                  }
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                />
              </div>

              {canApplyCatalog && (
                <label className="sm:col-span-2 flex items-center gap-2 text-xs font-medium text-[#142B4F] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={applyToCatalog}
                    onChange={(e) => setApplyToCatalog(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#2563EB]"
                  />
                  Atualizar automaticamente o preço de venda no cadastro de{" "}
                  {itemType === "service" ? "Serviços" : "Produtos"} ao gravar
                </label>
              )}
            </div>

            {/* Cost & Margin Inputs */}
            {itemType === "service" ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Custo de materiais / insumos (R$)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    value={serviceForm.materialCostReais}
                    onChange={(e) =>
                      setServiceNum("materialCostReais", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Tempo de atendimento (minutos)</Label>
                  <Input
                    type="number"
                    min="5"
                    value={serviceForm.durationMinutes}
                    onChange={(e) =>
                      setServiceNum("durationMinutes", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Custo/hora de mão de obra (R$)</Label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    value={serviceForm.hourlyLaborCostReais}
                    onChange={(e) =>
                      setServiceNum("hourlyLaborCostReais", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Custos variáveis extras (R$)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    value={serviceForm.variableCostReais}
                    onChange={(e) =>
                      setServiceNum("variableCostReais", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Custos fixos mensais (R$)</Label>
                  <Input
                    type="number"
                    step="50"
                    min="0"
                    value={serviceForm.monthlyFixedCostsReais}
                    onChange={(e) =>
                      setServiceNum("monthlyFixedCostsReais", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Horas produtivas / mês</Label>
                  <Input
                    type="number"
                    min="1"
                    value={serviceForm.monthlyBillableHours}
                    onChange={(e) =>
                      setServiceNum("monthlyBillableHours", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Impostos (%)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    max="50"
                    value={serviceForm.taxPercent}
                    onChange={(e) => setServiceNum("taxPercent", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Comissão do profissional (%)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    max="80"
                    value={serviceForm.commissionPercent}
                    onChange={(e) =>
                      setServiceNum("commissionPercent", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Taxa de cartão / pagamento (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="20"
                    value={serviceForm.paymentFeePercent}
                    onChange={(e) =>
                      setServiceNum("paymentFeePercent", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Margem de lucro desejada (%)</Label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    max="80"
                    value={serviceForm.desiredMarginPercent}
                    onChange={(e) =>
                      setServiceNum("desiredMarginPercent", e.target.value)
                    }
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Custo de compra / fabricação (R$)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    value={productForm.purchaseCostReais}
                    onChange={(e) =>
                      setProductNum("purchaseCostReais", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Frete + embalagem unitário (R$)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    value={productForm.freightAndPackagingReais}
                    onChange={(e) =>
                      setProductNum("freightAndPackagingReais", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Outros custos variáveis (R$)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    value={productForm.variableCostReais}
                    onChange={(e) =>
                      setProductNum("variableCostReais", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Rateio de custo fixo por unidade (R$)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    value={productForm.fixedCostPerUnitReais}
                    onChange={(e) =>
                      setProductNum("fixedCostPerUnitReais", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Impostos (%)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    max="50"
                    value={productForm.taxPercent}
                    onChange={(e) => setProductNum("taxPercent", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Comissão de venda (%)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    max="80"
                    value={productForm.commissionPercent}
                    onChange={(e) =>
                      setProductNum("commissionPercent", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Taxa de cartão / pagamento (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="20"
                    value={productForm.paymentFeePercent}
                    onChange={(e) =>
                      setProductNum("paymentFeePercent", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Margem de lucro desejada (%)</Label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    max="80"
                    value={productForm.desiredMarginPercent}
                    onChange={(e) =>
                      setProductNum("desiredMarginPercent", e.target.value)
                    }
                  />
                </div>
              </div>
            )}
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
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="solidOrange">
                      Preço Recomendado (
                      {itemType === "service" ? "Serviço" : "Produto"})
                    </Badge>
                  </div>
                  <p className="text-4xl font-extrabold">
                    {formatCurrencyBRL(
                      Math.round(result.recommendedPriceReais * 100)
                    )}
                  </p>

                  <div className="grid grid-cols-2 gap-3 border-t border-white/15 pt-4 text-xs">
                    <div>
                      <p className="text-slate-300">Custo total unitário</p>
                      <p className="mt-0.5 text-base font-bold">
                        {formatCurrencyBRL(
                          Math.round(result.totalCostReais * 100)
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-300">Preço mínimo (empate)</p>
                      <p className="mt-0.5 text-base font-bold text-amber-300">
                        {formatCurrencyBRL(
                          Math.round(result.minimumPriceReais * 100)
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-300">
                        {itemType === "service"
                          ? "Lucro por atendimento"
                          : "Lucro por unidade"}
                      </p>
                      <p className="mt-0.5 text-base font-bold text-emerald-300">
                        {formatCurrencyBRL(
                          Math.round(result.estimatedProfitReais * 100)
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-300">Margem líquida real</p>
                      <p className="mt-0.5 text-base font-bold text-emerald-300">
                        {result.realMarginPercent.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={handleSavePrice}
                    disabled={saving}
                    className="w-full bg-[#FF914D] text-white hover:bg-[#e87c3a]"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {saving ? "Gravando..." : "Gravar preço na lista"}
                  </Button>
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
                      {sc.qty}{" "}
                      {itemType === "service"
                        ? "atendimentos/mês"
                        : "unidades/mês"}
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

      {/* Saved Prices List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg">
                Preços Criados e Gravados ({savedItems.length})
              </CardTitle>
              <CardDescription>
                Histórico de precificações por serviço e por produto. Clique em &quot;Carregar&quot; para editar ou simular novamente.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-xl border border-slate-200 bg-[#F5F7FA] p-1">
                {(
                  [
                    ["all", "Todos"],
                    ["service", "Serviços"],
                    ["product", "Produtos"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setListFilter(key)}
                    className={cn(
                      "rounded-lg px-3 py-1 text-xs font-semibold transition-colors cursor-pointer",
                      listFilter === key
                        ? "bg-[#2563EB] text-white"
                        : "text-[#64748B] hover:text-[#142B4F]"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nome..."
                  className="h-9 w-48 pl-8 text-xs"
                />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {filteredSavedItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-sm text-[#64748B]">
              Nenhum preço gravado ainda. Preencha o nome do serviço ou produto acima e clique em{" "}
              <strong className="text-[#142B4F]">Gravar preço na lista</strong>.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[#64748B]">
                    <th className="pb-2.5 pr-3 font-semibold">Tipo</th>
                    <th className="pb-2.5 pr-3 font-semibold">Item</th>
                    <th className="pb-2.5 pr-3 font-semibold">Custo Unit.</th>
                    <th className="pb-2.5 pr-3 font-semibold">Mínimo</th>
                    <th className="pb-2.5 pr-3 font-semibold">Recomendado</th>
                    <th className="pb-2.5 pr-3 font-semibold">Lucro / Margem</th>
                    <th className="pb-2.5 pr-3 font-semibold">Criado em</th>
                    <th className="pb-2.5 text-right font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSavedItems.map((item) => (
                    <tr key={item.id} className="hover:bg-[#F5F7FA]/60">
                      <td className="py-3 pr-3">
                        <Badge
                          variant={
                            item.itemType === "service" ? "default" : "orange"
                          }
                        >
                          {item.itemType === "service" ? "Serviço" : "Produto"}
                        </Badge>
                      </td>
                      <td className="py-3 pr-3 font-bold text-[#142B4F]">
                        {item.itemName}
                      </td>
                      <td className="py-3 pr-3 text-[#64748B]">
                        {formatCurrencyBRL(item.totalCostCents)}
                      </td>
                      <td className="py-3 pr-3 text-amber-700 font-medium">
                        {formatCurrencyBRL(item.minimumPriceCents)}
                      </td>
                      <td className="py-3 pr-3 text-sm font-extrabold text-[#2563EB]">
                        {formatCurrencyBRL(item.recommendedPriceCents)}
                      </td>
                      <td className="py-3 pr-3">
                        <span className="font-semibold text-emerald-700">
                          {formatCurrencyBRL(item.estimatedProfitCents)}
                        </span>{" "}
                        <span className="text-[#64748B]">
                          ({item.realMarginPercent}%)
                        </span>
                      </td>
                      <td className="py-3 pr-3 text-[#64748B]">
                        {formatDatePtBr(item.createdAtIso)}
                      </td>
                      <td className="py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleLoadSavedItem(item)}
                            title="Carregar na calculadora"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Carregar
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={deletingId === item.id}
                            onClick={() => handleDeleteSavedItem(item.id)}
                            title="Excluir preço gravado"
                          >
                            {deletingId === item.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5 text-red-600" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
