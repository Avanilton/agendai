"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Layers,
  Loader2,
  MessageCircle,
  Plus,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  consumePackageSessionAction,
  convertBudgetToSaleAction,
  createBudgetAction,
  createPackageAction,
  updateBudgetStatusAction,
} from "@/modules/packages-budgets/actions";
import { evaluatePackageHealth } from "@/modules/packages-budgets/logic";
import { buildWhatsAppUrl } from "@/modules/communications/templates";
import { formatCurrencyBRL, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";

export interface PackageRow {
  id: string;
  clientName: string;
  serviceName: string | null;
  name: string;
  totalSessions: number;
  usedSessions: number;
  priceCents: number;
  expiresAt: string | null;
  status: "active" | "completed" | "expired" | "cancelled";
}

export interface BudgetRow {
  id: string;
  clientName: string;
  clientPhone: string | null;
  title: string;
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  validUntil: string | null;
  status: "draft" | "sent" | "approved" | "rejected" | "expired" | "converted";
  createdAtIso: string;
}

interface PackagesBudgetsHubProps {
  organizationName: string;
  packages: PackageRow[];
  budgets: BudgetRow[];
  clients: { id: string; name: string }[];
  services: { id: string; name: string; priceCents: number }[];
  products: { id: string; name: string; priceCents: number }[];
  accounts: { id: string; name: string }[];
  canWrite: boolean;
  canConvertSale: boolean;
}

const BUDGET_STATUS_LABELS: Record<string, string> = {
  draft: "Em elaboração",
  sent: "Enviado",
  approved: "Aprovado",
  rejected: "Recusado",
  expired: "Expirado",
  converted: "Convertido em Venda",
};

export function PackagesBudgetsHub({
  organizationName,
  packages,
  budgets,
  clients,
  services,
  products,
  accounts,
  canWrite,
  canConvertSale,
}: PackagesBudgetsHubProps) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  const [tab, setTab] = useState<"packages" | "budgets">("packages");

  // Package modal
  const [pkgModalOpen, setPkgModalOpen] = useState(false);
  const [savingPkg, setSavingPkg] = useState(false);
  const [pkgForm, setPkgForm] = useState({
    clientId: clients[0]?.id ?? "",
    serviceId: "",
    name: "",
    totalSessions: 5,
    priceReais: 0,
    expiresAt: "",
    accountId: accounts[0]?.id ?? "",
    paymentMethod: "pix",
    launchInFinancial: true,
    notes: "",
  });

  // Budget modal
  const [bgtModalOpen, setBgtModalOpen] = useState(false);
  const [savingBgt, setSavingBgt] = useState(false);
  const [bgtClientId, setBgtClientId] = useState(clients[0]?.id ?? "");
  const [bgtTitle, setBgtTitle] = useState("");
  const [bgtDiscount, setBgtDiscount] = useState(0);
  const [bgtValidUntil, setBgtValidUntil] = useState("");
  const [bgtLines, setBgtLines] = useState<
    { itemType: "product" | "service"; itemId: string; quantity: number; unitPriceReais: number }[]
  >([]);

  // Convert budget modal
  const [convertTarget, setConvertTarget] = useState<BudgetRow | null>(null);
  const [convAccountId, setConvAccountId] = useState(accounts[0]?.id ?? "");
  const [convPayMethod, setConvPayMethod] = useState("pix");
  const [convInstallments, setConvInstallments] = useState(1);
  const [converting, setConverting] = useState(false);

  async function handleCreatePackage(e: React.FormEvent) {
    e.preventDefault();
    setSavingPkg(true);
    const res = await createPackageAction(pkgForm);
    setSavingPkg(false);
    if (!res.success) {
      toast.error(res.error || "Erro ao criar pacote.");
      return;
    }
    toast.success("Pacote cadastrado!");
    setPkgModalOpen(false);
    setPkgForm((p) => ({ ...p, name: "", priceReais: 0, notes: "" }));
    router.refresh();
  }

  async function handleConsumeSession(pkg: PackageRow) {
    const res = await consumePackageSessionAction(pkg.id, {});
    if (!res.success) {
      toast.error(res.error || "Não foi possível consumir sessão.");
      return;
    }
    toast.success(`1 sessão utilizada em "${pkg.name}"!`);
    router.refresh();
  }

  function addBudgetLine(type: "product" | "service") {
    const first = type === "product" ? products[0] : services[0];
    if (!first) {
      toast.error("Cadastre ao menos um item desse tipo primeiro.");
      return;
    }
    setBgtLines((prev) => [
      ...prev,
      {
        itemType: type,
        itemId: first.id,
        quantity: 1,
        unitPriceReais: first.priceCents / 100,
      },
    ]);
  }

  async function handleCreateBudget(e: React.FormEvent) {
    e.preventDefault();
    if (bgtLines.length === 0) {
      toast.error("Adicione pelo menos um item ao orçamento.");
      return;
    }
    setSavingBgt(true);
    const res = await createBudgetAction({
      clientId: bgtClientId,
      title: bgtTitle,
      discountReais: bgtDiscount,
      validUntil: bgtValidUntil,
      items: bgtLines,
    });
    setSavingBgt(false);
    if (!res.success) {
      toast.error(res.error || "Erro ao criar orçamento.");
      return;
    }
    toast.success("Orçamento criado!");
    setBgtModalOpen(false);
    setBgtTitle("");
    setBgtDiscount(0);
    setBgtLines([]);
    router.refresh();
  }

  async function handleSendBudgetWhatsApp(b: BudgetRow) {
    const msg = `Olá, ${b.clientName}! Segue seu orçamento "${b.title}" da ${organizationName} no valor total de ${formatCurrencyBRL(
      b.totalCents
    )}${b.validUntil ? ` (válido até ${b.validUntil.split("-").reverse().join("/")})` : ""}. Aguardamos seu retorno!`;

    const url = buildWhatsAppUrl(b.clientPhone, msg);
    if (!url) {
      toast.error("Cliente sem WhatsApp válido.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");

    if (b.status === "draft" && canWrite) {
      await updateBudgetStatusAction(b.id, "sent");
      router.refresh();
    }
  }

  async function handleConvertSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!convertTarget) return;
    setConverting(true);
    const res = await convertBudgetToSaleAction(convertTarget.id, {
      accountId: convAccountId,
      paymentMethod: convPayMethod,
      installments: convInstallments,
    });
    setConverting(false);
    if (!res.success) {
      toast.error(res.error || "Erro ao converter orçamento.");
      return;
    }
    toast.success("Orçamento convertido em venda! Estoque e financeiro atualizados.");
    setConvertTarget(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Tabs + Action */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
          <button
            type="button"
            onClick={() => setTab("packages")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold cursor-pointer",
              tab === "packages"
                ? "bg-[#2563EB] text-white"
                : "text-[#64748B] hover:text-[#142B4F]"
            )}
          >
            <Layers className="h-3.5 w-3.5" />
            Pacotes e Sessões
          </button>
          <button
            type="button"
            onClick={() => setTab("budgets")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold cursor-pointer",
              tab === "budgets"
                ? "bg-[#2563EB] text-white"
                : "text-[#64748B] hover:text-[#142B4F]"
            )}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Orçamentos
          </button>
        </div>

        {canWrite && (
          <Button
            size="sm"
            onClick={() =>
              tab === "packages" ? setPkgModalOpen(true) : setBgtModalOpen(true)
            }
          >
            <Plus className="h-4 w-4" />
            {tab === "packages" ? "Novo pacote" : "Novo orçamento"}
          </Button>
        )}
      </div>

      {/* TAB 1: PACKAGES */}
      {tab === "packages" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {packages.length === 0 ? (
            <Card className="border-dashed md:col-span-2 lg:col-span-3">
              <CardContent className="py-12 text-center text-sm text-[#64748B]">
                Nenhum pacote de sessões cadastrado ainda.
              </CardContent>
            </Card>
          ) : (
            packages.map((pkg) => {
              const health = evaluatePackageHealth(pkg, today);
              const pct = Math.min(
                100,
                Math.round((pkg.usedSessions / pkg.totalSessions) * 100)
              );
              return (
                <Card key={pkg.id}>
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-[#142B4F]">{pkg.name}</p>
                        <p className="text-xs text-[#64748B]">
                          {pkg.clientName}
                          {pkg.serviceName ? ` • ${pkg.serviceName}` : ""}
                        </p>
                      </div>
                      <Badge
                        variant={
                          health.isExpired
                            ? "destructive"
                            : pkg.status === "completed"
                              ? "success"
                              : health.isLowSessions || health.isExpiringSoon
                                ? "orange"
                                : "default"
                        }
                      >
                        {health.isExpired
                          ? "Vencido"
                          : pkg.status === "completed"
                            ? "Concluído"
                            : `${health.remainingSessions} restantes`}
                      </Badge>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-[#64748B]">
                        <span>
                          Utilizadas: {pkg.usedSessions}/{pkg.totalSessions}
                        </span>
                        <span className="font-semibold text-[#142B4F]">
                          {formatCurrencyBRL(pkg.priceCents)}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full bg-[#2563EB] transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    {(health.isExpiringSoon || health.isLowSessions) && (
                      <p className="flex items-center gap-1.5 text-[11px] font-medium text-[#C2410C]">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {health.isExpiringSoon
                          ? `Vence em ${pkg.expiresAt?.split("-").reverse().join("/")}`
                          : "Poucas sessões restantes — hora de renovar!"}
                      </p>
                    )}

                    {canWrite && health.canConsumeSession && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="w-full"
                        onClick={() => handleConsumeSession(pkg)}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Registrar uso de 1 sessão
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: BUDGETS */}
      {tab === "budgets" && (
        <div className="space-y-3">
          {budgets.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-sm text-[#64748B]">
                Nenhum orçamento criado ainda.
              </CardContent>
            </Card>
          ) : (
            budgets.map((b) => (
              <Card key={b.id}>
                <CardContent className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-sm text-[#142B4F]">{b.title}</p>
                      <Badge
                        variant={
                          b.status === "converted" || b.status === "approved"
                            ? "success"
                            : b.status === "rejected"
                              ? "destructive"
                              : "default"
                        }
                      >
                        {BUDGET_STATUS_LABELS[b.status]}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-[#64748B]">
                      Cliente: <strong>{b.clientName}</strong>
                      {b.validUntil
                        ? ` • Válido até ${b.validUntil.split("-").reverse().join("/")}`
                        : ""}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-extrabold text-[#142B4F]">
                      {formatCurrencyBRL(b.totalCents)}
                    </span>

                    {b.clientPhone && b.status !== "converted" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSendBudgetWhatsApp(b)}
                      >
                        <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                        WhatsApp
                      </Button>
                    )}

                    {canWrite && (b.status === "draft" || b.status === "sent") && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={async () => {
                          await updateBudgetStatusAction(b.id, "approved");
                          toast.success("Orçamento aprovado!");
                          router.refresh();
                        }}
                      >
                        Aprovar
                      </Button>
                    )}

                    {canConvertSale &&
                      b.status !== "converted" &&
                      b.status !== "rejected" && (
                        <Button size="sm" onClick={() => setConvertTarget(b)}>
                          <ShoppingBag className="h-3.5 w-3.5" />
                          Converter em Venda
                        </Button>
                      )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* CREATE PACKAGE MODAL */}
      <Modal
        open={pkgModalOpen}
        onClose={() => setPkgModalOpen(false)}
        title="Novo pacote de sessões"
      >
        <form onSubmit={handleCreatePackage} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Cliente *</Label>
              <select
                value={pkgForm.clientId}
                onChange={(e) => setPkgForm({ ...pkgForm, clientId: e.target.value })}
                className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#142B4F]"
                required
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Serviço principal (opcional)</Label>
              <select
                value={pkgForm.serviceId}
                onChange={(e) => setPkgForm({ ...pkgForm, serviceId: e.target.value })}
                className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#142B4F]"
              >
                <option value="">Qualquer serviço</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1 sm:col-span-2">
              <Label>Nome do pacote *</Label>
              <Input
                placeholder="Ex.: 10 Sessões de Drenagem"
                value={pkgForm.name}
                onChange={(e) => setPkgForm({ ...pkgForm, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Qtd. sessões *</Label>
              <Input
                type="number"
                min="1"
                value={pkgForm.totalSessions}
                onChange={(e) =>
                  setPkgForm({ ...pkgForm, totalSessions: Number(e.target.value) })
                }
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label>Valor total (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={pkgForm.priceReais}
                onChange={(e) =>
                  setPkgForm({ ...pkgForm, priceReais: Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Validade (opcional)</Label>
              <Input
                type="date"
                value={pkgForm.expiresAt}
                onChange={(e) => setPkgForm({ ...pkgForm, expiresAt: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Conta financeira</Label>
              <select
                value={pkgForm.accountId}
                onChange={(e) => setPkgForm({ ...pkgForm, accountId: e.target.value })}
                className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs text-[#142B4F]"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 rounded-xl bg-[#F5F7FA] p-3 text-xs font-medium text-[#142B4F] cursor-pointer">
            <input
              type="checkbox"
              checked={pkgForm.launchInFinancial}
              onChange={(e) =>
                setPkgForm({ ...pkgForm, launchInFinancial: e.target.checked })
              }
            />
            Lançar receita automaticamente no módulo Financeiro
          </label>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setPkgModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={savingPkg}>
              {savingPkg && <Loader2 className="h-4 w-4 animate-spin" />}
              Criar pacote
            </Button>
          </div>
        </form>
      </Modal>

      {/* CREATE BUDGET MODAL */}
      <Modal
        open={bgtModalOpen}
        onClose={() => setBgtModalOpen(false)}
        title="Novo orçamento"
      >
        <form onSubmit={handleCreateBudget} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Cliente *</Label>
              <select
                value={bgtClientId}
                onChange={(e) => setBgtClientId(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#142B4F]"
                required
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Título do orçamento *</Label>
              <Input
                placeholder="Ex.: Tratamento Facial Completo"
                value={bgtTitle}
                onChange={(e) => setBgtTitle(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Itens do orçamento *</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => addBudgetLine("service")}
                >
                  + Serviço
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => addBudgetLine("product")}
                >
                  + Produto
                </Button>
              </div>
            </div>

            {bgtLines.map((line, idx) => (
              <div key={idx} className="grid grid-cols-12 items-center gap-2">
                <select
                  value={line.itemId}
                  onChange={(e) => {
                    const newId = e.target.value;
                    const src =
                      line.itemType === "product"
                        ? products.find((p) => p.id === newId)
                        : services.find((s) => s.id === newId);
                    setBgtLines((prev) =>
                      prev.map((l, i) =>
                        i === idx
                          ? {
                              ...l,
                              itemId: newId,
                              unitPriceReais: src ? src.priceCents / 100 : 0,
                            }
                          : l
                      )
                    );
                  }}
                  className="col-span-6 h-9 rounded-lg border border-slate-300 bg-white px-2 text-xs text-[#142B4F]"
                >
                  {(line.itemType === "product" ? products : services).map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
                <Input
                  type="number"
                  min="1"
                  value={line.quantity}
                  onChange={(e) =>
                    setBgtLines((prev) =>
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
                  value={line.unitPriceReais}
                  onChange={(e) =>
                    setBgtLines((prev) =>
                      prev.map((l, i) =>
                        i === idx
                          ? { ...l, unitPriceReais: Number(e.target.value) }
                          : l
                      )
                    )
                  }
                  className="col-span-3 h-9 px-2 text-xs"
                />
                <button
                  type="button"
                  onClick={() =>
                    setBgtLines((prev) => prev.filter((_, i) => i !== idx))
                  }
                  className="col-span-1 flex justify-center text-red-600 cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Desconto (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={bgtDiscount}
                onChange={(e) => setBgtDiscount(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label>Válido até</Label>
              <Input
                type="date"
                value={bgtValidUntil}
                onChange={(e) => setBgtValidUntil(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setBgtModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={savingBgt}>
              {savingBgt && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar orçamento
            </Button>
          </div>
        </form>
      </Modal>

      {/* CONVERT BUDGET TO SALE MODAL */}
      <Modal
        open={Boolean(convertTarget)}
        onClose={() => setConvertTarget(null)}
        title="Converter orçamento em venda"
        description={
          convertTarget
            ? `${convertTarget.title} — ${formatCurrencyBRL(convertTarget.totalCents)}`
            : undefined
        }
      >
        <form onSubmit={handleConvertSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label>Conta destino</Label>
              <select
                value={convAccountId}
                onChange={(e) => setConvAccountId(e.target.value)}
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
              <Label>Pagamento</Label>
              <select
                value={convPayMethod}
                onChange={(e) => setConvPayMethod(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs text-[#142B4F]"
              >
                <option value="pix">Pix</option>
                <option value="credit_card">Cartão Crédito</option>
                <option value="debit_card">Cartão Débito</option>
                <option value="cash">Dinheiro</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Parcelas</Label>
              <Input
                type="number"
                min="1"
                max="24"
                value={convInstallments}
                onChange={(e) => setConvInstallments(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setConvertTarget(null)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={converting}>
              {converting && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirmar conversão
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

