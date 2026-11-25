"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createSaleAction } from "@/modules/commerce/actions";
import { formatCurrencyBRL } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";

export interface SaleRow {
  id: string;
  clientName: string | null;
  professionalName: string | null;
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  paymentMethod: string;
  installments: number;
  status: string;
  createdAtIso: string;
}

interface SalesManagerProps {
  initialSales: SaleRow[];
  clients: { id: string; name: string }[];
  professionals: { id: string; name: string }[];
  products: { id: string; name: string; priceCents: number; stockQuantity: number }[];
  services: { id: string; name: string; priceCents: number }[];
  accounts: { id: string; name: string }[];
  canWrite: boolean;
}

interface DraftLine {
  itemType: "product" | "service";
  itemId: string;
  quantity: number;
  unitPriceReais: number;
}

const PAYMENT_LABELS: Record<string, string> = {
  pix: "Pix",
  cash: "Dinheiro",
  credit_card: "Cartão Crédito",
  debit_card: "Cartão Débito",
  bank_transfer: "Transferência",
  other: "Outro",
};

export function SalesManager({
  initialSales,
  clients,
  professionals,
  products,
  services,
  accounts,
  canWrite,
}: SalesManagerProps) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [clientId, setClientId] = useState("");
  const [professionalId, setProfessionalId] = useState("");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [installments, setInstallments] = useState(1);
  const [discountReais, setDiscountReais] = useState(0);
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([]);

  function addLine(type: "product" | "service") {
    const first = type === "product" ? products[0] : services[0];
    if (!first) {
      toast.error(
        type === "product"
          ? "Nenhum produto cadastrado."
          : "Nenhum serviço cadastrado."
      );
      return;
    }
    setLines((prev) => [
      ...prev,
      {
        itemType: type,
        itemId: first.id,
        quantity: 1,
        unitPriceReais: first.priceCents / 100,
      },
    ]);
  }

  function updateLine(index: number, patch: Partial<DraftLine>) {
    setLines((prev) =>
      prev.map((l, idx) => (idx === index ? { ...l, ...patch } : l))
    );
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, idx) => idx !== index));
  }

  const subtotalReais = lines.reduce(
    (acc, l) => acc + l.quantity * l.unitPriceReais,
    0
  );
  const totalReais = Math.max(0, subtotalReais - discountReais);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (lines.length === 0) {
      toast.error("Adicione pelo menos um produto ou serviço.");
      return;
    }

    setSaving(true);
    const result = await createSaleAction({
      clientId,
      professionalId,
      accountId,
      paymentMethod,
      installments,
      discountReais,
      notes,
      items: lines,
    });
    setSaving(false);

    if (!result.success) {
      toast.error(result.error || "Erro ao finalizar venda.");
      return;
    }

    toast.success("Venda finalizada! Estoque e financeiro atualizados automaticamente.");
    setModalOpen(false);
    setLines([]);
    setDiscountReais(0);
    setNotes("");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        {canWrite && (
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Nova venda
          </Button>
        )}
      </div>

      {initialSales.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EAF2FF] text-[#2563EB]">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <h3 className="mt-3 text-base font-bold text-[#142B4F]">
              Nenhuma venda registrada ainda
            </h3>
            <p className="mt-1 text-sm text-[#64748B]">
              Cada venda baixa produtos do estoque e gera receita no financeiro automaticamente.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {initialSales.map((sale) => (
            <Card key={sale.id}>
              <CardContent className="flex flex-col justify-between gap-2 p-4 sm:flex-row sm:items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm text-[#142B4F]">
                      {sale.clientName || "Venda Balcão"}
                    </p>
                    <Badge variant="success">Concluída</Badge>
                    {sale.installments > 1 && (
                      <Badge variant="outline">{sale.installments}x</Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-[#64748B]">
                    {new Date(sale.createdAtIso).toLocaleString("pt-BR")} •{" "}
                    {PAYMENT_LABELS[sale.paymentMethod] ?? sale.paymentMethod}
                    {sale.professionalName ? ` • ${sale.professionalName}` : ""}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-base font-extrabold text-emerald-700">
                    {formatCurrencyBRL(sale.totalCents)}
                  </p>
                  {sale.discountCents > 0 && (
                    <p className="text-[11px] text-[#64748B]">
                      Desc.: {formatCurrencyBRL(sale.discountCents)}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nova venda integrada"
        description="Produtos são baixados do estoque com histórico e a receita é lançada automaticamente no Financeiro."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="s-cli">Cliente (opcional)</Label>
              <select
                id="s-cli"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#142B4F]"
              >
                <option value="">Venda balcão (sem cliente)</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="s-pro">Profissional (opcional)</Label>
              <select
                id="s-pro"
                value={professionalId}
                onChange={(e) => setProfessionalId(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#142B4F]"
              >
                <option value="">Nenhum</option>
                {professionals.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Itens da venda *</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => addLine("product")}
                >
                  + Produto
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => addLine("service")}
                >
                  + Serviço
                </Button>
              </div>
            </div>

            {lines.length === 0 ? (
              <p className="rounded-xl bg-[#F5F7FA] p-4 text-center text-xs text-[#64748B]">
                Clique em &quot;+ Produto&quot; ou &quot;+ Serviço&quot; para adicionar itens.
              </p>
            ) : (
              <div className="space-y-2">
                {lines.map((line, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-12 items-center gap-2 rounded-xl border border-slate-200 bg-[#F5F7FA]/60 p-2.5"
                  >
                    <select
                      value={line.itemId}
                      onChange={(e) => {
                        const newId = e.target.value;
                        const src =
                          line.itemType === "product"
                            ? products.find((p) => p.id === newId)
                            : services.find((s) => s.id === newId);
                        updateLine(idx, {
                          itemId: newId,
                          unitPriceReais: src ? src.priceCents / 100 : 0,
                        });
                      }}
                      className="col-span-6 h-9 rounded-lg border border-slate-300 bg-white px-2 text-xs text-[#142B4F]"
                    >
                      {(line.itemType === "product" ? products : services).map(
                        (opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.name}
                          </option>
                        )
                      )}
                    </select>
                    <Input
                      type="number"
                      min="1"
                      value={line.quantity}
                      onChange={(e) =>
                        updateLine(idx, { quantity: Number(e.target.value) })
                      }
                      className="col-span-2 h-9 px-2 text-xs"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={line.unitPriceReais}
                      onChange={(e) =>
                        updateLine(idx, {
                          unitPriceReais: Number(e.target.value),
                        })
                      }
                      className="col-span-3 h-9 px-2 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => removeLine(idx)}
                      className="col-span-1 flex justify-center text-red-600 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="space-y-1">
              <Label htmlFor="s-acc">Conta *</Label>
              <select
                id="s-acc"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs text-[#142B4F]"
                required
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="s-pay">Pagamento</Label>
              <select
                id="s-pay"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs text-[#142B4F]"
              >
                {Object.entries(PAYMENT_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="s-inst">Parcelas</Label>
              <Input
                id="s-inst"
                type="number"
                min="1"
                max="24"
                value={installments}
                onChange={(e) => setInstallments(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="s-disc">Desconto (R$)</Label>
              <Input
                id="s-disc"
                type="number"
                step="0.01"
                min="0"
                value={discountReais}
                onChange={(e) => setDiscountReais(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-[#142B4F] px-4 py-3 text-white">
            <span className="text-xs font-medium">Total da venda</span>
            <span className="text-lg font-extrabold">
              {formatCurrencyBRL(Math.round(totalReais * 100))}
            </span>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Finalizar venda
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

