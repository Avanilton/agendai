"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Package, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  createProductAction,
  deleteProductAction,
  updateProductAction,
} from "@/modules/products/actions";
import { calculateMarginPercent } from "@/lib/plans/limits";
import { formatCurrencyBRL } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";

export interface ProductRow {
  id: string;
  supplierId: string | null;
  supplierName: string | null;
  name: string;
  sku: string | null;
  barcode: string | null;
  category: string | null;
  description: string | null;
  costCents: number;
  priceCents: number;
  stockQuantity: number;
  minStockQuantity: number;
  status: "active" | "inactive";
}

interface ProductsManagerProps {
  initialProducts: ProductRow[];
  suppliers: { id: string; name: string }[];
  canWrite: boolean;
}

const EMPTY_FORM = {
  name: "",
  sku: "",
  barcode: "",
  category: "",
  description: "",
  costReais: 0,
  priceReais: 0,
  stockQuantity: 0,
  minStockQuantity: 0,
  supplierId: "",
  status: "active" as "active" | "inactive",
};

export function ProductsManager({
  initialProducts,
  suppliers,
  canWrite,
}: ProductsManagerProps) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const liveMargin = calculateMarginPercent(
    Math.round(form.costReais * 100),
    Math.round(form.priceReais * 100)
  );

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(prod: ProductRow) {
    setEditingId(prod.id);
    setForm({
      name: prod.name,
      sku: prod.sku ?? "",
      barcode: prod.barcode ?? "",
      category: prod.category ?? "",
      description: prod.description ?? "",
      costReais: prod.costCents / 100,
      priceReais: prod.priceCents / 100,
      stockQuantity: prod.stockQuantity,
      minStockQuantity: prod.minStockQuantity,
      supplierId: prod.supplierId ?? "",
      status: prod.status,
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const result = editingId
      ? await updateProductAction(editingId, form)
      : await createProductAction(form);
    setSaving(false);

    if (!result.success) {
      toast.error(result.error || "Erro ao salvar produto.");
      return;
    }

    toast.success(editingId ? "Produto atualizado!" : "Produto cadastrado!");
    setModalOpen(false);
    router.refresh();
  }

  async function handleDelete(prod: ProductRow) {
    if (!window.confirm(`Deseja remover o produto "${prod.name}"?`)) return;
    const result = await deleteProductAction(prod.id);
    if (!result.success) {
      toast.error(result.error || "Erro ao remover produto.");
      return;
    }
    toast.success("Produto removido.");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        {canWrite && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Novo produto
          </Button>
        )}
      </div>

      {initialProducts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EAF2FF] text-[#2563EB]">
              <Package className="h-6 w-6" />
            </div>
            <h3 className="mt-3 text-base font-bold text-[#142B4F]">
              Nenhum produto cadastrado
            </h3>
            <p className="mt-1 text-sm text-[#64748B]">
              Cadastre produtos de venda ou consumo interno com custo, margem e estoque mínimo.
            </p>
            {canWrite && (
              <Button className="mt-4" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Cadastrar produto
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {initialProducts.map((prod) => {
            const margin = calculateMarginPercent(prod.costCents, prod.priceCents);
            const lowStock = prod.stockQuantity <= prod.minStockQuantity;
            return (
              <Card key={prod.id}>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-[#142B4F]">{prod.name}</p>
                      <p className="text-xs text-[#64748B]">
                        {[prod.sku, prod.category].filter(Boolean).join(" • ") || "Sem categoria"}
                      </p>
                    </div>
                    {lowStock ? (
                      <Badge variant="orange">
                        <AlertTriangle className="h-3 w-3" />
                        Estoque baixo
                      </Badge>
                    ) : (
                      <Badge variant={prod.status === "active" ? "success" : "outline"}>
                        {prod.status === "active" ? "Ativo" : "Inativo"}
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 rounded-xl bg-[#F5F7FA] p-3 text-xs">
                    <div>
                      <p className="text-[#64748B]">Venda</p>
                      <p className="font-bold text-[#142B4F]">
                        {formatCurrencyBRL(prod.priceCents)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[#64748B]">Margem</p>
                      <p className="font-bold text-emerald-700">{margin}%</p>
                    </div>
                    <div>
                      <p className="text-[#64748B]">Estoque</p>
                      <p className="font-bold text-[#142B4F]">
                        {prod.stockQuantity} un.
                      </p>
                    </div>
                  </div>

                  {prod.supplierName && (
                    <p className="text-xs text-[#64748B]">
                      Fornecedor: <strong className="text-[#142B4F]">{prod.supplierName}</strong>
                    </p>
                  )}

                  {canWrite && (
                    <div className="flex justify-end gap-1 pt-1">
                      <Button size="sm" variant="outline" onClick={() => openEdit(prod)}>
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(prod)}>
                        <Trash2 className="h-3.5 w-3.5 text-red-600" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Editar produto" : "Novo produto"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="pr-name">Nome do produto *</Label>
              <Input
                id="pr-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pr-cat">Categoria</Label>
              <Input
                id="pr-cat"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="pr-sku">SKU</Label>
              <Input
                id="pr-sku"
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pr-bar">Código de barras</Label>
              <Input
                id="pr-bar"
                value={form.barcode}
                onChange={(e) => setForm({ ...form, barcode: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pr-sup">Fornecedor</Label>
              <select
                id="pr-sup"
                value={form.supplierId}
                onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
                className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#142B4F]"
              >
                <option value="">Sem fornecedor</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="pr-cost">Custo (R$)</Label>
              <Input
                id="pr-cost"
                type="number"
                step="0.01"
                min="0"
                value={form.costReais}
                onChange={(e) => setForm({ ...form, costReais: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pr-price">Preço venda (R$)</Label>
              <Input
                id="pr-price"
                type="number"
                step="0.01"
                min="0"
                value={form.priceReais}
                onChange={(e) => setForm({ ...form, priceReais: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pr-stk">Estoque atual</Label>
              <Input
                id="pr-stk"
                type="number"
                min="0"
                value={form.stockQuantity}
                onChange={(e) => setForm({ ...form, stockQuantity: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pr-min">Estoque mínimo</Label>
              <Input
                id="pr-min"
                type="number"
                min="0"
                value={form.minStockQuantity}
                onChange={(e) => setForm({ ...form, minStockQuantity: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="rounded-xl bg-[#EAF2FF]/60 px-4 py-2.5 text-xs text-[#142B4F]">
            Margem estimada sobre o preço de venda:{" "}
            <strong className="text-[#2563EB]">{liveMargin}%</strong>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingId ? "Salvar alterações" : "Cadastrar produto"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

