"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Building,
  CheckCircle2,
  Landmark,
  Loader2,
  Plus,
  Tags,
  TrendingUp,
  Wallet,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  cancelTransactionAction,
  createCostCenterAction,
  createFinancialAccountAction,
  createFinancialCategoryAction,
  createTransactionAction,
  settleTransactionAction,
} from "@/modules/financial/actions";
import {
  calculateNetAmountCents,
  summarizeFinancialMetrics,
  type FinancialTxStatus,
  type FinancialTxType,
} from "@/modules/financial/calculations";
import { formatCurrencyBRL, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";

export interface FinancialAccountRow {
  id: string;
  name: string;
  type: "cash" | "checking" | "savings" | "digital";
  initialBalanceCents: number;
  currentBalanceCents: number;
}

export interface FinancialCategoryRow {
  id: string;
  name: string;
  type: "income" | "expense";
  color: string;
}

export interface CostCenterRow {
  id: string;
  name: string;
  description: string | null;
}

export interface FinancialTransactionRow {
  id: string;
  type: FinancialTxType;
  description: string;
  amountCents: number;
  discountCents: number;
  interestCents: number;
  fineCents: number;
  paidAmountCents: number;
  status: FinancialTxStatus;
  paymentMethod: string;
  dueDate: string;
  accountId: string;
  categoryName: string | null;
  clientName: string | null;
  supplierName: string | null;
  installmentNumber: number;
  installmentTotal: number;
}

interface FinancialHubProps {
  accounts: FinancialAccountRow[];
  categories: FinancialCategoryRow[];
  costCenters: CostCenterRow[];
  transactions: FinancialTransactionRow[];
  clients: { id: string; name: string }[];
  suppliers: { id: string; name: string }[];
  canWrite: boolean;
}

const PAYMENT_LABELS: Record<string, string> = {
  pix: "Pix",
  cash: "Dinheiro",
  credit_card: "Cartão Crédito",
  debit_card: "Cartão Débito",
  bank_transfer: "Transferência",
  other: "Outro",
};

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  cash: "Caixa Físico",
  checking: "Conta Corrente",
  savings: "Poupança",
  digital: "Carteira / Maquininha",
};

function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function FinancialHub({
  accounts,
  categories,
  costCenters,
  transactions,
  clients,
  suppliers,
  canWrite,
}: FinancialHubProps) {
  const router = useRouter();
  const todayStr = getTodayStr();

  const [tab, setTab] = useState<"transactions" | "accounts" | "categories">("transactions");
  const [period, setPeriod] = useState<"month" | "30d" | "7d" | "today" | "all">("month");
  const [typeFilter, setTypeFilter] = useState<"all" | FinancialTxType>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "paid" | "overdue">("all");

  // New transaction modal
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [savingTx, setSavingTx] = useState(false);
  const [txForm, setTxForm] = useState({
    type: "income" as FinancialTxType,
    description: "",
    amountReais: 0,
    discountReais: 0,
    interestReais: 0,
    fineReais: 0,
    paymentMethod: "pix" as "pix" | "cash" | "credit_card" | "debit_card" | "bank_transfer" | "other",
    dueDate: todayStr,
    markAsPaid: true,
    accountId: accounts[0]?.id ?? "",
    destinationAccountId: "",
    categoryId: "",
    costCenterId: "",
    clientId: "",
    supplierId: "",
    installments: 1,
    isRecurring: false,
    notes: "",
  });

  // Settle (partial/full) modal
  const [settleTarget, setSettleTarget] = useState<FinancialTransactionRow | null>(null);
  const [settleForm, setSettleForm] = useState({
    paidAmountReais: 0,
    discountReais: 0,
    interestReais: 0,
    fineReais: 0,
    paymentMethod: "pix" as "pix" | "cash" | "credit_card" | "debit_card" | "bank_transfer" | "other",
  });
  const [settling, setSettling] = useState(false);

  // Quick forms for accounts / categories / cost centers
  const [accName, setAccName] = useState("");
  const [accType, setAccType] = useState<"cash" | "checking" | "savings" | "digital">("checking");
  const [accInitial, setAccInitial] = useState(0);

  const [catName, setCatName] = useState("");
  const [catType, setCatType] = useState<"income" | "expense">("expense");

  const [ccName, setCcName] = useState("");

  const periodFiltered = useMemo(() => {
    const now = new Date();
    const monthPrefix = todayStr.slice(0, 7);
    const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60_000).toISOString().slice(0, 10);
    const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60_000).toISOString().slice(0, 10);

    return transactions.filter((tx) => {
      if (period === "today") return tx.dueDate === todayStr;
      if (period === "7d") return tx.dueDate >= d7;
      if (period === "30d") return tx.dueDate >= d30;
      if (period === "month") return tx.dueDate.startsWith(monthPrefix);
      return true;
    });
  }, [transactions, period, todayStr]);

  const metrics = useMemo(
    () => summarizeFinancialMetrics(periodFiltered, todayStr),
    [periodFiltered, todayStr]
  );

  const visibleTransactions = useMemo(() => {
    return periodFiltered.filter((tx) => {
      if (typeFilter !== "all" && tx.type !== typeFilter) return false;
      if (statusFilter === "paid") return tx.status === "paid";
      if (statusFilter === "pending") return tx.status === "pending" || tx.status === "partial";
      if (statusFilter === "overdue") {
        return (tx.status === "pending" || tx.status === "partial") && tx.dueDate < todayStr;
      }
      return true;
    });
  }, [periodFiltered, typeFilter, statusFilter, todayStr]);

  const totalCashRatio =
    metrics.totalIncomeReceivedCents + metrics.totalExpensePaidCents;
  const incomePct =
    totalCashRatio > 0
      ? Math.round((metrics.totalIncomeReceivedCents / totalCashRatio) * 100)
      : 50;

  async function handleCreateTx(e: React.FormEvent) {
    e.preventDefault();
    setSavingTx(true);
    const result = await createTransactionAction(txForm);
    setSavingTx(false);

    if (!result.success) {
      toast.error(result.error || "Erro ao registrar lançamento.");
      return;
    }

    toast.success("Lançamento financeiro salvo!");
    setTxModalOpen(false);
    setTxForm((prev) => ({
      ...prev,
      description: "",
      amountReais: 0,
      discountReais: 0,
      interestReais: 0,
      fineReais: 0,
      installments: 1,
      notes: "",
    }));
    router.refresh();
  }

  function openSettle(tx: FinancialTransactionRow) {
    const net = calculateNetAmountCents(tx);
    const remaining = Math.max(0, net - tx.paidAmountCents);
    setSettleTarget(tx);
    setSettleForm({
      paidAmountReais: remaining / 100,
      discountReais: tx.discountCents / 100,
      interestReais: tx.interestCents / 100,
      fineReais: tx.fineCents / 100,
      paymentMethod: tx.paymentMethod as typeof settleForm.paymentMethod,
    });
  }

  async function handleSettleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!settleTarget) return;
    setSettling(true);
    const result = await settleTransactionAction(settleTarget.id, settleForm);
    setSettling(false);

    if (!result.success) {
      toast.error(result.error || "Erro ao dar baixa no lançamento.");
      return;
    }

    toast.success("Baixa financeira registrada!");
    setSettleTarget(null);
    router.refresh();
  }

  async function handleCancelTx(tx: FinancialTransactionRow) {
    if (!window.confirm(`Cancelar o lançamento "${tx.description}"?`)) return;
    const result = await cancelTransactionAction(tx.id);
    if (!result.success) {
      toast.error(result.error || "Erro ao cancelar.");
      return;
    }
    toast.success("Lançamento cancelado.");
    router.refresh();
  }

  async function handleAddAccount(e: React.FormEvent) {
    e.preventDefault();
    const res = await createFinancialAccountAction({
      name: accName,
      type: accType,
      initialBalanceReais: accInitial,
    });
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    toast.success("Conta adicionada!");
    setAccName("");
    setAccInitial(0);
    router.refresh();
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    const res = await createFinancialCategoryAction({
      name: catName,
      type: catType,
      color: catType === "income" ? "#10B981" : "#EF4444",
    });
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    toast.success("Categoria adicionada!");
    setCatName("");
    router.refresh();
  }

  async function handleAddCostCenter(e: React.FormEvent) {
    e.preventDefault();
    const res = await createCostCenterAction({ name: ccName });
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    toast.success("Centro de custo adicionado!");
    setCcName("");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Period filter + CTA */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex flex-wrap rounded-xl border border-slate-200 bg-white p-1">
          {(
            [
              ["month", "Este mês"],
              ["30d", "Últimos 30d"],
              ["7d", "7 dias"],
              ["today", "Hoje"],
              ["all", "Todos"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setPeriod(key)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer",
                period === key
                  ? "bg-[#142B4F] text-white"
                  : "text-[#64748B] hover:text-[#142B4F]"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {canWrite && (
          <Button onClick={() => setTxModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Novo lançamento
          </Button>
        )}
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-xs text-[#64748B]">
              <span>Receitas recebidas</span>
              <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-2 text-2xl font-extrabold text-emerald-700">
              {formatCurrencyBRL(metrics.totalIncomeReceivedCents)}
            </p>
            <p className="mt-1 text-xs text-[#64748B]">
              A receber: {formatCurrencyBRL(metrics.receivablePendingCents)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-xs text-[#64748B]">
              <span>Despesas pagas</span>
              <ArrowUpRight className="h-4 w-4 text-red-600" />
            </div>
            <p className="mt-2 text-2xl font-extrabold text-red-700">
              {formatCurrencyBRL(metrics.totalExpensePaidCents)}
            </p>
            <p className="mt-1 text-xs text-[#64748B]">
              A pagar: {formatCurrencyBRL(metrics.payablePendingCents)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-xs text-[#64748B]">
              <span>Lucro líquido</span>
              <TrendingUp className="h-4 w-4 text-[#2563EB]" />
            </div>
            <p
              className={cn(
                "mt-2 text-2xl font-extrabold",
                metrics.netProfitCents >= 0 ? "text-[#142B4F]" : "text-red-700"
              )}
            >
              {formatCurrencyBRL(metrics.netProfitCents)}
            </p>
            <p className="mt-1 text-xs text-[#64748B]">
              Ticket médio: {formatCurrencyBRL(metrics.averageTicketCents)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-xs text-[#64748B]">
              <span>Contas vencidas</span>
              <AlertCircle className="h-4 w-4 text-[#FF914D]" />
            </div>
            <p className="mt-2 text-2xl font-extrabold text-[#C2410C]">
              {formatCurrencyBRL(metrics.overdueCents)}
            </p>
            <p className="mt-1 text-xs text-[#64748B]">
              {metrics.overdueCount}{" "}
              {metrics.overdueCount === 1 ? "lançamento vencido" : "lançamentos vencidos"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Visual Cash Flow Proportion Bar */}
      <Card>
        <CardContent className="p-5 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-semibold text-[#142B4F]">
            <span>Fluxo de Caixa Realizado (Receitas × Despesas)</span>
            <span className="text-[#64748B]">
              {incomePct}% Receitas / {100 - incomePct}% Despesas
            </span>
          </div>
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="bg-emerald-500 transition-all"
              style={{ width: `${incomePct}%` }}
            />
            <div
              className="bg-red-400 transition-all"
              style={{ width: `${100 - incomePct}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
        {(
          [
            ["transactions", "Lançamentos", Wallet],
            ["accounts", "Contas e Caixa", Landmark],
            ["categories", "Categorias e Centros", Tags],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer",
              tab === key
                ? "bg-[#2563EB] text-white"
                : "text-[#64748B] hover:text-[#142B4F]"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* TAB 1: TRANSACTIONS */}
      {tab === "transactions" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
              className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-[#142B4F]"
            >
              <option value="all">Todos os tipos</option>
              <option value="income">Receitas</option>
              <option value="expense">Despesas</option>
              <option value="transfer">Transferências</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-[#142B4F]"
            >
              <option value="all">Todos os status</option>
              <option value="pending">Pendentes / Parciais</option>
              <option value="paid">Pagos / Recebidos</option>
              <option value="overdue">Vencidos</option>
            </select>
          </div>

          {visibleTransactions.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-sm text-[#64748B]">
                Nenhum lançamento financeiro encontrado neste filtro.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2.5">
              {visibleTransactions.map((tx) => {
                const net = calculateNetAmountCents(tx);
                const isOverdue =
                  (tx.status === "pending" || tx.status === "partial") &&
                  tx.dueDate < todayStr;
                return (
                  <Card key={tx.id}>
                    <CardContent className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center">
                      <div className="flex items-start gap-3 min-w-0">
                        <span
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                            tx.type === "income"
                              ? "bg-emerald-50 text-emerald-700"
                              : tx.type === "expense"
                                ? "bg-red-50 text-red-700"
                                : "bg-[#EAF2FF] text-[#2563EB]"
                          )}
                        >
                          {tx.type === "income" ? (
                            <ArrowDownLeft className="h-5 w-5" />
                          ) : tx.type === "expense" ? (
                            <ArrowUpRight className="h-5 w-5" />
                          ) : (
                            <ArrowLeftRight className="h-5 w-5" />
                          )}
                        </span>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-bold text-sm text-[#142B4F]">
                              {tx.description}
                            </p>
                            <Badge
                              variant={
                                tx.status === "paid"
                                  ? "success"
                                  : tx.status === "cancelled"
                                    ? "outline"
                                    : isOverdue
                                      ? "destructive"
                                      : "orange"
                              }
                            >
                              {tx.status === "paid"
                                ? "Liquidado"
                                : tx.status === "partial"
                                  ? "Parcial"
                                  : tx.status === "cancelled"
                                    ? "Cancelado"
                                    : isOverdue
                                      ? "Vencido"
                                      : "Pendente"}
                            </Badge>
                          </div>
                          <p className="mt-0.5 text-xs text-[#64748B]">
                            Venc.: {tx.dueDate.split("-").reverse().join("/")} •{" "}
                            {PAYMENT_LABELS[tx.paymentMethod] ?? tx.paymentMethod}
                            {tx.categoryName ? ` • ${tx.categoryName}` : ""}
                            {tx.clientName ? ` • ${tx.clientName}` : ""}
                            {tx.supplierName ? ` • ${tx.supplierName}` : ""}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3 sm:justify-end">
                        <div className="text-right">
                          <p
                            className={cn(
                              "text-base font-extrabold",
                              tx.type === "income"
                                ? "text-emerald-700"
                                : tx.type === "expense"
                                  ? "text-red-700"
                                  : "text-[#142B4F]"
                            )}
                          >
                            {tx.type === "expense" ? "- " : "+ "}
                            {formatCurrencyBRL(net)}
                          </p>
                          {tx.status === "partial" && (
                            <p className="text-[11px] text-[#64748B]">
                              Pago: {formatCurrencyBRL(tx.paidAmountCents)}
                            </p>
                          )}
                        </div>

                        {canWrite &&
                          (tx.status === "pending" || tx.status === "partial") && (
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => openSettle(tx)}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Baixar
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleCancelTx(tx)}
                              >
                                <XCircle className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ACCOUNTS & CASH */}
      {tab === "accounts" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {accounts.map((acc) => (
              <Card key={acc.id}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-[#142B4F]">{acc.name}</p>
                    <Badge variant="outline">{ACCOUNT_TYPE_LABELS[acc.type]}</Badge>
                  </div>
                  <p className="mt-3 text-2xl font-extrabold text-[#2563EB]">
                    {formatCurrencyBRL(acc.currentBalanceCents)}
                  </p>
                  <p className="mt-1 text-xs text-[#64748B]">
                    Saldo inicial: {formatCurrencyBRL(acc.initialBalanceCents)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {canWrite && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Nova conta bancária ou caixa</CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={handleAddAccount}
                  className="grid grid-cols-1 gap-3 sm:grid-cols-4"
                >
                  <Input
                    placeholder="Nome (ex.: Nubank PJ, Caixa 2)"
                    value={accName}
                    onChange={(e) => setAccName(e.target.value)}
                    required
                  />
                  <select
                    value={accType}
                    onChange={(e) => setAccType(e.target.value as typeof accType)}
                    className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#142B4F]"
                  >
                    <option value="cash">Caixa Físico</option>
                    <option value="checking">Conta Corrente</option>
                    <option value="savings">Poupança</option>
                    <option value="digital">Carteira / Maquininha</option>
                  </select>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Saldo inicial (R$)"
                    value={accInitial}
                    onChange={(e) => setAccInitial(Number(e.target.value))}
                  />
                  <Button type="submit">
                    <Plus className="h-4 w-4" />
                    Adicionar conta
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* TAB 3: CATEGORIES & COST CENTERS */}
      {tab === "categories" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Categorias Financeiras</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <Badge
                    key={cat.id}
                    variant={cat.type === "income" ? "success" : "destructive"}
                  >
                    {cat.name}
                  </Badge>
                ))}
              </div>
              {canWrite && (
                <form onSubmit={handleAddCategory} className="flex gap-2">
                  <Input
                    placeholder="Nova categoria"
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    required
                  />
                  <select
                    value={catType}
                    onChange={(e) => setCatType(e.target.value as "income" | "expense")}
                    className="h-10 rounded-lg border border-slate-300 bg-white px-2 text-xs text-[#142B4F]"
                  >
                    <option value="income">Receita</option>
                    <option value="expense">Despesa</option>
                  </select>
                  <Button type="submit" size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Building className="h-4 w-4 text-[#2563EB]" />
                Centros de Custo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {costCenters.length === 0 ? (
                <p className="text-xs text-[#64748B]">
                  Nenhum centro de custo cadastrado (ex.: Clínica, Estética, Administrativo).
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {costCenters.map((cc) => (
                    <Badge key={cc.id} variant="default">
                      {cc.name}
                    </Badge>
                  ))}
                </div>
              )}
              {canWrite && (
                <form onSubmit={handleAddCostCenter} className="flex gap-2">
                  <Input
                    placeholder="Novo centro de custo"
                    value={ccName}
                    onChange={(e) => setCcName(e.target.value)}
                    required
                  />
                  <Button type="submit" size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* NEW TRANSACTION MODAL */}
      <Modal
        open={txModalOpen}
        onClose={() => setTxModalOpen(false)}
        title="Novo lançamento financeiro"
        description="Registre receitas, despesas, transferências e parcelamentos automáticos."
      >
        <form onSubmit={handleCreateTx} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="f-type">Tipo</Label>
              <select
                id="f-type"
                value={txForm.type}
                onChange={(e) =>
                  setTxForm({ ...txForm, type: e.target.value as FinancialTxType })
                }
                className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#142B4F]"
              >
                <option value="income">Receita (A receber)</option>
                <option value="expense">Despesa (A pagar)</option>
                <option value="transfer">Transferência</option>
              </select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="f-desc">Descrição *</Label>
              <Input
                id="f-desc"
                placeholder="Ex.: Consulta, Aluguel, Compra de insumos..."
                value={txForm.description}
                onChange={(e) => setTxForm({ ...txForm, description: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="f-val">Valor total (R$) *</Label>
              <Input
                id="f-val"
                type="number"
                step="0.01"
                min="0.01"
                value={txForm.amountReais}
                onChange={(e) =>
                  setTxForm({ ...txForm, amountReais: Number(e.target.value) })
                }
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-due">Vencimento *</Label>
              <Input
                id="f-due"
                type="date"
                value={txForm.dueDate}
                onChange={(e) => setTxForm({ ...txForm, dueDate: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-pay">Pagamento</Label>
              <select
                id="f-pay"
                value={txForm.paymentMethod}
                onChange={(e) =>
                  setTxForm({
                    ...txForm,
                    paymentMethod: e.target.value as typeof txForm.paymentMethod,
                  })
                }
                className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm text-[#142B4F]"
              >
                {Object.entries(PAYMENT_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            {txForm.type !== "transfer" && (
              <div className="space-y-1.5">
                <Label htmlFor="f-inst">Parcelas</Label>
                <Input
                  id="f-inst"
                  type="number"
                  min="1"
                  max="24"
                  value={txForm.installments}
                  onChange={(e) =>
                    setTxForm({ ...txForm, installments: Number(e.target.value) })
                  }
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="f-acc">Conta / Caixa *</Label>
              <select
                id="f-acc"
                value={txForm.accountId}
                onChange={(e) => setTxForm({ ...txForm, accountId: e.target.value })}
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

            {txForm.type === "transfer" ? (
              <div className="space-y-1.5">
                <Label htmlFor="f-dest">Conta de destino *</Label>
                <select
                  id="f-dest"
                  value={txForm.destinationAccountId}
                  onChange={(e) =>
                    setTxForm({ ...txForm, destinationAccountId: e.target.value })
                  }
                  className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#142B4F]"
                  required
                >
                  <option value="">Selecione...</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="f-cat">Categoria</Label>
                <select
                  id="f-cat"
                  value={txForm.categoryId}
                  onChange={(e) => setTxForm({ ...txForm, categoryId: e.target.value })}
                  className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#142B4F]"
                >
                  <option value="">Sem categoria</option>
                  {categories
                    .filter((c) => c.type === txForm.type)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>

          {txForm.type !== "transfer" && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {txForm.type === "income" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="f-client">Cliente (opcional)</Label>
                  <select
                    id="f-client"
                    value={txForm.clientId}
                    onChange={(e) => setTxForm({ ...txForm, clientId: e.target.value })}
                    className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#142B4F]"
                  >
                    <option value="">Nenhum</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label htmlFor="f-sup">Fornecedor (opcional)</Label>
                  <select
                    id="f-sup"
                    value={txForm.supplierId}
                    onChange={(e) => setTxForm({ ...txForm, supplierId: e.target.value })}
                    className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#142B4F]"
                  >
                    <option value="">Nenhum</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="f-cc">Centro de custo (opcional)</Label>
                <select
                  id="f-cc"
                  value={txForm.costCenterId}
                  onChange={(e) => setTxForm({ ...txForm, costCenterId: e.target.value })}
                  className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#142B4F]"
                >
                  <option value="">Nenhum</option>
                  {costCenters.map((cc) => (
                    <option key={cc.id} value={cc.id}>
                      {cc.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <label className="flex items-center gap-2 rounded-xl bg-[#F5F7FA] p-3 text-xs font-medium text-[#142B4F] cursor-pointer">
            <input
              type="checkbox"
              checked={txForm.markAsPaid}
              onChange={(e) => setTxForm({ ...txForm, markAsPaid: e.target.checked })}
            />
            Já recebido / pago agora (liquidar 1ª parcela imediatamente)
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setTxModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={savingTx}>
              {savingTx && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar lançamento
            </Button>
          </div>
        </form>
      </Modal>

      {/* SETTLE (PARTIAL / FULL) MODAL */}
      <Modal
        open={Boolean(settleTarget)}
        onClose={() => setSettleTarget(null)}
        title="Registrar pagamento / baixa"
        description={settleTarget?.description}
      >
        <form onSubmit={handleSettleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="st-val">Valor recebido/pago agora (R$)</Label>
              <Input
                id="st-val"
                type="number"
                step="0.01"
                min="0.01"
                value={settleForm.paidAmountReais}
                onChange={(e) =>
                  setSettleForm({ ...settleForm, paidAmountReais: Number(e.target.value) })
                }
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="st-pay">Forma de pagamento</Label>
              <select
                id="st-pay"
                value={settleForm.paymentMethod}
                onChange={(e) =>
                  setSettleForm({
                    ...settleForm,
                    paymentMethod: e.target.value as typeof settleForm.paymentMethod,
                  })
                }
                className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#142B4F]"
              >
                {Object.entries(PAYMENT_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="st-disc">Desconto (R$)</Label>
              <Input
                id="st-disc"
                type="number"
                step="0.01"
                min="0"
                value={settleForm.discountReais}
                onChange={(e) =>
                  setSettleForm({ ...settleForm, discountReais: Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="st-int">Juros (R$)</Label>
              <Input
                id="st-int"
                type="number"
                step="0.01"
                min="0"
                value={settleForm.interestReais}
                onChange={(e) =>
                  setSettleForm({ ...settleForm, interestReais: Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="st-fine">Multa (R$)</Label>
              <Input
                id="st-fine"
                type="number"
                step="0.01"
                min="0"
                value={settleForm.fineReais}
                onChange={(e) =>
                  setSettleForm({ ...settleForm, fineReais: Number(e.target.value) })
                }
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setSettleTarget(null)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={settling}>
              {settling && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirmar baixa
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

