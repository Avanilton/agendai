"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowDownUp,
  Loader2,
  Plus,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  createPurchaseAction,
  createStockMovementAction,
} from "@/modules/commerce/actions";
import { formatCurrencyBRL, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";

export interface MovementRow {
  id: string;
  productName: string;
  type: "in" | "out" | "adjustment" | "return";
  quantityDelta: number;
  previousQuantity: number;
  newQuantity: number;
  reason: string;
  createdAtIso: string;
}

export interface PurchaseRow {
  id: string;
  supplierName: string;
  totalCents: number;
  paymentMethod: string;
  status: string;
  receivedAtIso: string;
}

interface InventoryHubProps {
  products: {
    id: string;
    name: string;
    stockQuantity: number;
    minStockQuantity: number;
    costCents: number;
  }[];
  suppliers: { id: string; name: string }[];
  accounts: { id: string; name: string }[];
  movements: MovementRow[];
  purchases: PurchaseRow[];
  canWrite: boolean;
}

const MOVEMENT_LABELS: Record<string, string> = {
  in: "Entrada",
  out: "Saída",
  adjustment: "Ajuste / Inventário",
  return: "Devolução",
};

export function InventoryHub({
  products,
  suppliers,
  accounts,
  movements,
  purchases,
  canWrite,
}: InventoryHubProps) {
  const router = useRouter();
  const [tab, setTab] = useState<"movements" | "purchases">("movements");

  const [movModalOpen, setMovModalOpen] = useState(false);
  const [savingMov, setSavingMov] = useState(false);
  const [movForm, setMovForm] = useState({
    productId: products[0]?.id ?? "",
    type: "in" as "in" | "out" | "adjustment" | "return",
    quantity: 1,
    reason: "",
  });

  const [purModalOpen, setPurModalOpen] = useState(false);
  const [savingPur, setSavingPur] = useState(false);
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? "");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [discountReais, setDiscountReais] = useState(0);
  const [taxReais, setTaxReais] = useState(0);
  const [purLines, setPurLines] = useState<
    { productId: string; quantity: number; unitCostReais: number }[]
  >([]);

  const lowStockProducts = products.filter(
    (p) => p.stockQuantity <= p.minStockQuantity
  );

  async function handleSaveMovement(e: React.FormEvent) {
    e.preventDefault();
    setSavingMov(true);
    const res = await createStockMovementAction(movForm);
    setSavingMov(false);
    if (!res.success) {
      toast.error(res.error || "Erro ao registrar movimentação.");
      return;
    }
    toast.success("Estoque atualizado com histórico rastreável!");
    setMovModalOpen(false);
    setMovForm((prev) => ({ ...prev, reason: "", quantity: 1 }));
    router.refresh();
  }

  function addPurchaseLine() {
    const first = products[0];
    if (!first) {
      toast.error("Cadastre um produto primeiro.");
      return;
    }
    setPurLines((prev) => [
      ...prev,
      { productId: first.id, quantity: 1, unitCostReais: first.costCents / 100 },
    ]);
  }

  async function handleSavePurchase(e: React.FormEvent) {
    e.preventDefault();
    if (purLines.length === 0) {
      toast.error("Adicione pelo menos um produto à compra.");
      return;
    }
    setSavingPur(true);
    const res = await createPurchaseAction({
      supplierId,
      accountId,
      paymentMethod,
      discountReais,
      taxReais,
      items: purLines,
    });
    setSavingPur(false);

    if (!res.success) {
      toast.error(res.error || "Erro ao registrar compra.");
      return;
    }

    toast.success("Compra recebida! Entrada no estoque e despesa financeira criadas.");
    setPurModalOpen(false);
    setPurLines([]);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Low Stock Alert Strip */}
      {lowStockProducts.length > 0 && (
        <Card className="border-amber-200 bg-[#FFF0E5]/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-[#C2410C]">
              <AlertTriangle className="h-4 w-4" />
              {lowStockProducts.length}{" "}
              {lowStockProducts.length === 1
                ? "produto abaixo ou no estoque mínimo"
                : "produtos abaixo ou no estoque mínimo"}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {lowStockProducts.slice(0, 8).map((p) => (
                <Badge key={p.id} variant="orange">
                  {p.name}: {p.stockQuantity} / mín. {p.minStockQuantity}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs + Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
          <button
            type="button"
            onClick={() => setTab("movements")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold cursor-pointer",
              tab === "movements"
                ? "bg-[#2563EB] text-white"
                : "text-[#64748B] hover:text-[#142B4F]"
            )}
          >
            <ArrowDownUp className="h-3.5 w-3.5" />
            Movimentações de Estoque
          </button>
          <button
            type="button"
            onClick={() => setTab("purchases")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold cursor-pointer",
              tab === "purchases"
                ? "bg-[#2563EB] text-white"
                : "text-[#64748B] hover:text-[#142B4F]"
            )}
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            Compras de Fornecedores
          </button>
        </div>

        {canWrite && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setMovModalOpen(true)}>
              <ArrowDownUp className="h-4 w-4" />
              Movimentar estoque
            </Button>
            <Button size="sm" onClick={() => setPurModalOpen(true)}>
              <Plus className="h-4 w-4" />
              Nova compra
            </Button>
          </div>
        )}
      </div>

      {/* TAB 1: MOVEMENTS */}
      {tab === "movements" && (
        <div className="space-y-2.5">
          {movements.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-sm text-[#64748B]">
                Nenhuma movimentação de estoque registrada ainda.
              </CardContent>
            </Card>
          ) : (
            movements.map((m) => (
              <Card key={m.id}>
                <CardContent className="flex flex-col justify-between gap-2 p-4 sm:flex-row sm:items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-[#142B4F]">
                        {m.productName}
                      </p>
                      <Badge
                        variant={
                          m.quantityDelta > 0
                            ? "success"
                            : m.quantityDelta < 0
                              ? "destructive"
                              : "outline"
                        }
                      >
                        {MOVEMENT_LABELS[m.type]} ({m.quantityDelta > 0 ? `+${m.quantityDelta}` : m.quantityDelta})
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-[#64748B]">
                      {m.reason} • {new Date(m.createdAtIso).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <p className="text-xs font-semibold text-[#142B4F]">
                    Saldo: {m.previousQuantity} →{" "}
                    <span className="text-[#2563EB]">{m.newQuantity} un.</span>
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* TAB 2: PURCHASES */}
      {tab === "purchases" && (
        <div className="space-y-2.5">
          {purchases.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-sm text-[#64748B]">
                Nenhuma compra registrada ainda.
              </CardContent>
            </Card>
          ) : (
            purchases.map((pur) => (
              <Card key={pur.id}>
                <CardContent className="flex flex-col justify-between gap-2 p-4 sm:flex-row sm:items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-[#142B4F]">
                        {pur.supplierName}
                      </p>
                      <Badge variant="success">Recebida</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-[#64748B]">
                      {new Date(pur.receivedAtIso).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <p className="text-base font-extrabold text-red-700">
                    - {formatCurrencyBRL(pur.totalCents)}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* MANUAL MOVEMENT MODAL */}
      <Modal
        open={movModalOpen}
        onClose={() => setMovModalOpen(false)}
        title="Movimentar estoque"
        description="Toda alteração gera registro rastreável no histórico de inventário."
      >
        <form onSubmit={handleSaveMovement} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="m-prod">Produto *</Label>
            <select
              id="m-prod"
              value={movForm.productId}
              onChange={(e) => setMovForm({ ...movForm, productId: e.target.value })}
              className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#142B4F]"
              required
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (Atual: {p.stockQuantity})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="m-type">Tipo</Label>
              <select
                id="m-type"
                value={movForm.type}
                onChange={(e) =>
                  setMovForm({
                    ...movForm,
                    type: e.target.value as typeof movForm.type,
                  })
                }
                className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#142B4F]"
              >
                <option value="in">Entrada</option>
                <option value="out">Saída</option>
                <option value="adjustment">Ajuste (novo saldo exato)</option>
                <option value="return">Devolução</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-qty">
                {movForm.type === "adjustment" ? "Novo saldo *" : "Quantidade *"}
              </Label>
              <Input
                id="m-qty"
                type="number"
                min={movForm.type === "adjustment" ? 0 : 1}
                value={movForm.quantity}
                onChange={(e) =>
                  setMovForm({ ...movForm, quantity: Number(e.target.value) })
                }
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="m-reason">Motivo / Justificativa *</Label>
            <Input
              id="m-reason"
              placeholder="Ex.: Uso interno, inventário mensal, avaria..."
              value={movForm.reason}
              onChange={(e) => setMovForm({ ...movForm, reason: e.target.value })}
              required
              minLength={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setMovModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={savingMov}>
              {savingMov && <Loader2 className="h-4 w-4 animate-spin" />}
              Registrar movimentação
            </Button>
          </div>
        </form>
      </Modal>

      {/* NEW PURCHASE MODAL */}
      <Modal
        open={purModalOpen}
        onClose={() => setPurModalOpen(false)}
        title="Nova compra de fornecedor"
        description="Dá entrada automática no estoque e gera despesa no Financeiro."
      >
        <form onSubmit={handleSavePurchase} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="pu-sup">Fornecedor *</Label>
              <select
                id="pu-sup"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#142B4F]"
                required
              >
                <option value="">Selecione...</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="pu-acc">Conta financeira *</Label>
              <select
                id="pu-acc"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#142B4F]"
                required
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Produtos comprados *</Label>
              <Button type="button" size="sm" variant="secondary" onClick={addPurchaseLine}>
                + Produto
              </Button>
            </div>
            {purLines.map((line, idx) => (
              <div key={idx} className="grid grid-cols-12 items-center gap-2">
                <select
                  value={line.productId}
                  onChange={(e) =>
                    setPurLines((prev) =>
                      prev.map((l, i) =>
                        i === idx ? { ...l, productId: e.target.value } : l
                      )
                    )
                  }
                  className="col-span-6 h-9 rounded-lg border border-slate-300 bg-white px-2 text-xs text-[#142B4F]"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <Input
                  type="number"
                  min="1"
                  value={line.quantity}
                  onChange={(e) =>
                    setPurLines((prev) =>
                      prev.map((l, i) =>
                        i === idx ? { ...l, quantity: Number(e.target.value) } : l
                      )
                    )
                  }
                  className="col-span-2 h-9 px-2 text-xs"
                />
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={line.unitCostReais}
                  onChange={(e) =>
                    setPurLines((prev) =>
                      prev.map((l, i) =>
                        i === idx
                          ? { ...l, unitCostReais: Number(e.target.value) }
                          : l
                      )
                    )
                  }
                  className="col-span-3 h-9 px-2 text-xs"
                />
                <button
                  type="button"
                  onClick={() =>
                    setPurLines((prev) => prev.filter((_, i) => i !== idx))
                  }
                  className="col-span-1 flex justify-center text-red-600 cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label htmlFor="pu-pay">Pagamento</Label>
              <select
                id="pu-pay"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs text-[#142B4F]"
              >
                <option value="pix">Pix</option>
                <option value="bank_transfer">Transferência</option>
                <option value="credit_card">Cartão Crédito</option>
                <option value="cash">Dinheiro</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="pu-disc">Desconto (R$)</Label>
              <Input
                id="pu-disc"
                type="number"
                step="0.01"
                min="0"
                value={discountReais}
                onChange={(e) => setDiscountReais(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pu-tax">Impostos/Frete (R$)</Label>
              <Input
                id="pu-tax"
                type="number"
                step="0.01"
                min="0"
                value={taxReais}
                onChange={(e) => setTaxReais(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setPurModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={savingPur}>
              {savingPur && <Loader2 className="h-4 w-4 animate-spin" />}
              Registrar compra
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

