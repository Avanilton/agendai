"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  CreditCard,
  Loader2,
  Package,
  Pencil,
  Plus,
  Power,
  Repeat,
  Scissors,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { SubscriptionPlanRow } from "@/modules/subscriptions/service";
import type { SubscriptionPlanItem } from "@/db/schema/subscriptions";
import {
  createSubscriptionPlanAction,
  deleteSubscriptionPlanAction,
  toggleSubscriptionPlanAction,
  updateSubscriptionPlanAction,
} from "@/modules/subscriptions/actions";
import { formatCurrencyBRL } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  pix: "PIX",
  credit_card: "Cartão de Crédito",
  debit_card: "Cartão de Débito",
  cash: "Dinheiro",
  bank_transfer: "Transferência Bancária",
  other: "Outro",
};

interface SubscriptionsManagerProps {
  initialPlans: SubscriptionPlanRow[];
  services: { id: string; name: string; priceCents: number }[];
  products: { id: string; name: string; priceCents: number }[];
  canWrite: boolean;
}

export function SubscriptionsManager({
  initialPlans,
  services,
  products,
  canWrite,
}: SubscriptionsManagerProps) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priceReais, setPriceReais] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<
    "pix" | "cash" | "credit_card" | "debit_card" | "bank_transfer" | "other"
  >("pix");
  const [billingDueDay, setBillingDueDay] = useState(10);
  const [isActive, setIsActive] = useState(true);
  const [includedItems, setIncludedItems] = useState<SubscriptionPlanItem[]>([]);

  function openCreate() {
    setEditingId(null);
    setName("");
    setDescription("");
    setPriceReais(0);
    setPaymentMethod("pix");
    setBillingDueDay(10);
    setIsActive(true);
    setIncludedItems([]);
    setModalOpen(true);
  }

  function openEdit(plan: SubscriptionPlanRow) {
    setEditingId(plan.id);
    setName(plan.name);
    setDescription(plan.description ?? "");
    setPriceReais(plan.priceCents / 100);
    setPaymentMethod(plan.paymentMethod);
    setBillingDueDay(plan.billingDueDay);
    setIsActive(plan.isActive);
    setIncludedItems(plan.includedItems ?? []);
    setModalOpen(true);
  }

  function toggleItem(
    itemType: "service" | "product",
    item: { id: string; name: string }
  ) {
    setIncludedItems((prev) => {
      const exists = prev.find(
        (i) => i.itemType === itemType && i.itemId === item.id
      );
      if (exists) {
        return prev.filter(
          (i) => !(i.itemType === itemType && i.itemId === item.id)
        );
      }
      return [
        ...prev,
        {
          itemType,
          itemId: item.id,
          nameSnapshot: item.name,
          quantity: 1,
        },
      ];
    });
  }

  function updateItemQuantity(
    itemType: "service" | "product",
    itemId: string,
    quantity: number
  ) {
    setIncludedItems((prev) =>
      prev.map((i) =>
        i.itemType === itemType && i.itemId === itemId
          ? { ...i, quantity: Math.max(1, quantity) }
          : i
      )
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (includedItems.length === 0) {
      toast.error("Inclua pelo menos um serviço ou produto no plano.");
      return;
    }

    setSaving(true);
    const payload = {
      name,
      description,
      priceReais,
      includedItems,
      paymentMethod,
      billingDueDay,
      isActive,
    };

    const res = editingId
      ? await updateSubscriptionPlanAction(editingId, payload)
      : await createSubscriptionPlanAction(payload);

    setSaving(false);
    if (!res.success) {
      toast.error(res.error || "Erro ao salvar plano.");
      return;
    }

    toast.success(
      editingId ? "Plano atualizado com sucesso!" : "Plano de assinatura criado!"
    );
    setModalOpen(false);
    router.refresh();
  }

  async function handleToggle(plan: SubscriptionPlanRow) {
    const res = await toggleSubscriptionPlanAction(plan.id, !plan.isActive);
    if (!res.success) {
      toast.error(res.error || "Erro ao alterar status.");
      return;
    }
    toast.success(plan.isActive ? "Plano desativado." : "Plano ativado!");
    router.refresh();
  }

  async function handleDelete(plan: SubscriptionPlanRow) {
    if (!window.confirm(`Deseja excluir o plano "${plan.name}"?`)) return;
    const res = await deleteSubscriptionPlanAction(plan.id);
    if (!res.success) {
      toast.error(res.error || "Erro ao excluir plano.");
      return;
    }
    toast.success("Plano removido.");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[#64748B]">
          {initialPlans.length} plano(s) cadastrado(s) • Vincule um plano diretamente na ficha de cada cliente.
        </p>
        {canWrite && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Novo plano de assinatura
          </Button>
        )}
      </div>

      {initialPlans.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EAF2FF] text-[#2563EB]">
              <Repeat className="h-6 w-6" />
            </div>
            <h3 className="mt-3 text-base font-bold text-[#142B4F]">
              Nenhum plano de assinatura criado
            </h3>
            <p className="mt-1 max-w-md text-xs text-[#64748B]">
              Crie planos recorrentes (ex.: Plano Barba + Cabelo Mensal) com serviços, produtos, forma de pagamento e dia de vencimento.
            </p>
            {canWrite && (
              <Button className="mt-4" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Criar primeiro plano
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {initialPlans.map((plan) => (
            <Card key={plan.id} className={!plan.isActive ? "opacity-70" : undefined}>
              <CardContent className="flex h-full flex-col justify-between p-5 space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-extrabold text-[#142B4F]">
                        {plan.name}
                      </h3>
                      {plan.description && (
                        <p className="mt-0.5 text-xs text-[#64748B]">
                          {plan.description}
                        </p>
                      )}
                    </div>
                    <Badge variant={plan.isActive ? "success" : "outline"}>
                      {plan.isActive ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>

                  <p className="text-2xl font-extrabold text-[#2563EB]">
                    {formatCurrencyBRL(plan.priceCents)}
                    <span className="text-xs font-medium text-[#64748B]">
                      {" "}
                      /mês
                    </span>
                  </p>

                  <div className="flex flex-wrap gap-2 text-xs text-[#142B4F]">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-[#F5F7FA] px-2.5 py-1">
                      <CreditCard className="h-3.5 w-3.5 text-[#2563EB]" />
                      {PAYMENT_METHOD_LABELS[plan.paymentMethod] ??
                        plan.paymentMethod}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-lg bg-[#FFF0E5] px-2.5 py-1 text-[#C2410C] font-semibold">
                      <CalendarClock className="h-3.5 w-3.5" />
                      Vencimento dia {plan.billingDueDay}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-[#64748B]">
                      Itens incluídos ({plan.includedItems.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {plan.includedItems.map((item) => (
                        <Badge
                          key={`${item.itemType}-${item.itemId}`}
                          variant="outline"
                          className="gap-1 text-[11px]"
                        >
                          {item.itemType === "service" ? (
                            <Scissors className="h-3 w-3 text-[#2563EB]" />
                          ) : (
                            <Package className="h-3 w-3 text-[#FF914D]" />
                          )}
                          {item.quantity}x {item.nameSnapshot}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {canWrite && (
                  <div className="flex items-center justify-end gap-1.5 border-t border-slate-100 pt-3">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleToggle(plan)}
                      title={plan.isActive ? "Desativar plano" : "Ativar plano"}
                    >
                      <Power className="h-3.5 w-3.5" />
                      {plan.isActive ? "Desativar" : "Ativar"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEdit(plan)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(plan)}
                      title="Excluir plano"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-600" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Subscription Plan Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Editar plano de assinatura" : "Novo plano de assinatura"}
        description="Defina os serviços/produtos inclusos, forma de pagamento e dia fixo de vencimento."
        className="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sp-name">Nome do plano *</Label>
              <Input
                id="sp-name"
                placeholder="Ex.: Clube Barba & Cabelo Mensal"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sp-price">Valor mensal (R$) *</Label>
              <Input
                id="sp-price"
                type="number"
                step="0.01"
                min="0"
                value={priceReais}
                onChange={(e) => setPriceReais(Number(e.target.value))}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sp-desc">Descrição (opcional)</Label>
            <Input
              id="sp-desc"
              placeholder="Ex.: Direito a 4 cortes e 4 barbas por mês"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="sp-pay">Forma de pagamento *</Label>
              <select
                id="sp-pay"
                value={paymentMethod}
                onChange={(e) =>
                  setPaymentMethod(e.target.value as typeof paymentMethod)
                }
                className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#142B4F]"
              >
                {Object.entries(PAYMENT_METHOD_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sp-due">Dia de vencimento (1-31) *</Label>
              <Input
                id="sp-due"
                type="number"
                min={1}
                max={31}
                value={billingDueDay}
                onChange={(e) => setBillingDueDay(Number(e.target.value))}
                required
              />
            </div>

            <div className="flex items-end">
              <label className="flex h-10 w-full items-center gap-2 rounded-lg border border-slate-200 bg-[#F5F7FA] px-3 text-xs font-semibold text-[#142B4F] cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                Plano ativo
              </label>
            </div>
          </div>

          {/* Included Services */}
          <div className="space-y-2">
            <Label>Serviços incluídos no plano</Label>
            {services.length === 0 ? (
              <p className="text-xs text-[#64748B]">
                Nenhum serviço ativo cadastrado.
              </p>
            ) : (
              <div className="grid max-h-36 grid-cols-1 gap-2 overflow-y-auto rounded-xl border border-slate-200 bg-[#F5F7FA] p-3 sm:grid-cols-2">
                {services.map((svc) => {
                  const selected = includedItems.find(
                    (i) => i.itemType === "service" && i.itemId === svc.id
                  );
                  return (
                    <div
                      key={svc.id}
                      className="flex items-center justify-between gap-2 text-xs text-[#142B4F]"
                    >
                      <label className="flex items-center gap-2 cursor-pointer min-w-0">
                        <input
                          type="checkbox"
                          checked={Boolean(selected)}
                          onChange={() => toggleItem("service", svc)}
                        />
                        <span className="truncate font-medium">{svc.name}</span>
                      </label>
                      {selected && (
                        <input
                          type="number"
                          min={1}
                          max={99}
                          value={selected.quantity}
                          onChange={(e) =>
                            updateItemQuantity(
                              "service",
                              svc.id,
                              Number(e.target.value)
                            )
                          }
                          className="h-7 w-14 rounded border border-slate-300 bg-white px-1.5 text-center text-xs"
                          title="Quantidade mensal"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Included Products */}
          <div className="space-y-2">
            <Label>Produtos incluídos no plano (opcional)</Label>
            {products.length === 0 ? (
              <p className="text-xs text-[#64748B]">
                Nenhum produto ativo cadastrado.
              </p>
            ) : (
              <div className="grid max-h-32 grid-cols-1 gap-2 overflow-y-auto rounded-xl border border-slate-200 bg-[#F5F7FA] p-3 sm:grid-cols-2">
                {products.map((prod) => {
                  const selected = includedItems.find(
                    (i) => i.itemType === "product" && i.itemId === prod.id
                  );
                  return (
                    <div
                      key={prod.id}
                      className="flex items-center justify-between gap-2 text-xs text-[#142B4F]"
                    >
                      <label className="flex items-center gap-2 cursor-pointer min-w-0">
                        <input
                          type="checkbox"
                          checked={Boolean(selected)}
                          onChange={() => toggleItem("product", prod)}
                        />
                        <span className="truncate font-medium">{prod.name}</span>
                      </label>
                      {selected && (
                        <input
                          type="number"
                          min={1}
                          max={99}
                          value={selected.quantity}
                          onChange={(e) =>
                            updateItemQuantity(
                              "product",
                              prod.id,
                              Number(e.target.value)
                            )
                          }
                          className="h-7 w-14 rounded border border-slate-300 bg-white px-1.5 text-center text-xs"
                          title="Quantidade mensal"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingId ? "Salvar alterações" : "Criar plano"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

