"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  Calculator,
  Download,
  Loader2,
  Printer,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { parseClientsCsvPreview } from "@/modules/reports/csv";
import { importClientsCsvAction } from "@/modules/reports/actions";
import { formatCurrencyBRL } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ExecutiveReportsData {
  agenda: {
    total: number;
    completed: number;
    cancelled: number;
    noShow: number;
    attendanceRate: number;
    topProfessionals: { name: string; count: number; revenueCents: number }[];
  };
  financial: {
    totalIncomeReceivedCents: number;
    totalExpensePaidCents: number;
    netProfitCents: number;
    receivablePendingCents: number;
    payablePendingCents: number;
    overdueCount: number;
    overdueCents: number;
    averageTicketCents: number;
  };
  clients: {
    total: number;
    active: number;
    withLgpdConsent: number;
  };
  sales: {
    count: number;
    totalCents: number;
    averageTicketCents: number;
  };
  commissions: {
    pendingCents: number;
    paidCents: number;
    totalActiveCents: number;
    pendingCount: number;
  };
  inventory: {
    totalProducts: number;
    lowStockCount: number;
    costValueCents: number;
    saleValueCents: number;
  };
}

interface ReportsHubProps {
  data: ExecutiveReportsData;
  canExport: boolean;
  canImportClients: boolean;
}

const EXPORT_OPTIONS = [
  { key: "clients", label: "Clientes (CSV)" },
  { key: "appointments", label: "Agendamentos (CSV)" },
  { key: "financial", label: "Financeiro (CSV)" },
  { key: "products", label: "Produtos e Estoque (CSV)" },
  { key: "commissions", label: "Comissões (CSV)" },
];

export function ReportsHub({
  data,
  canExport,
  canImportClients,
}: ReportsHubProps) {
  const [csvText, setCsvText] = useState("");
  const [importing, setImporting] = useState(false);

  const preview = useMemo(
    () => (csvText.trim() ? parseClientsCsvPreview(csvText) : []),
    [csvText]
  );

  const validCount = preview.filter((p) => p.valid).length;
  const invalidCount = preview.length - validCount;

  async function handleImport() {
    if (validCount === 0) {
      toast.error("Corrija os erros antes de importar.");
      return;
    }
    setImporting(true);
    const res = await importClientsCsvAction(csvText);
    setImporting(false);

    if (!res.success || !res.data) {
      toast.error(res.error || "Erro na importação.");
      return;
    }

    toast.success(
      `Importação concluída: ${res.data.importedCount} clientes importados (${res.data.skippedCount} ignorados/duplicados).`
    );
    setCsvText("");
  }

  return (
    <div className="space-y-6">
      {/* Header actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Button variant="outline" size="sm" asChild>
          <Link href="/app/precificacao">
            <Calculator className="h-4 w-4 text-[#FF914D]" />
            Abrir Criador de Preços
          </Link>
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => window.print()}
        >
          <Printer className="h-4 w-4" />
          Imprimir / Salvar PDF
        </Button>
      </div>

      {/* Executive KPI Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-[#64748B]">Agenda • Comparecimento</p>
            <p className="mt-2 text-2xl font-extrabold text-[#2563EB]">
              {data.agenda.attendanceRate}%
            </p>
            <p className="mt-1 text-xs text-[#64748B]">
              {data.agenda.total} total • {data.agenda.cancelled} canc. • {data.agenda.noShow} faltas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-[#64748B]">Financeiro • Lucro Líquido</p>
            <p className="mt-2 text-2xl font-extrabold text-emerald-700">
              {formatCurrencyBRL(data.financial.netProfitCents)}
            </p>
            <p className="mt-1 text-xs text-[#64748B]">
              Receitas {formatCurrencyBRL(data.financial.totalIncomeReceivedCents)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-[#64748B]">Vendas • Ticket Médio</p>
            <p className="mt-2 text-2xl font-extrabold text-[#142B4F]">
              {formatCurrencyBRL(data.sales.averageTicketCents)}
            </p>
            <p className="mt-1 text-xs text-[#64748B]">
              {data.sales.count} vendas • Total {formatCurrencyBRL(data.sales.totalCents)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-[#64748B]">Estoque • Valor de Venda</p>
            <p className="mt-2 text-2xl font-extrabold text-[#142B4F]">
              {formatCurrencyBRL(data.inventory.saleValueCents)}
            </p>
            <p className="mt-1 text-xs text-[#64748B]">
              {data.inventory.totalProducts} produtos • {data.inventory.lowStockCount} em alerta
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance & Clients Summary */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-[#2563EB]" />
              Desempenho por Profissional
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.agenda.topProfessionals.length === 0 ? (
              <p className="text-xs text-[#64748B]">
                Nenhum atendimento registrado ainda para compor o ranking.
              </p>
            ) : (
              <div className="space-y-2.5">
                {data.agenda.topProfessionals.map((pro) => (
                  <div
                    key={pro.name}
                    className="flex items-center justify-between rounded-xl bg-[#F5F7FA] px-4 py-2.5 text-sm"
                  >
                    <div>
                      <p className="font-bold text-[#142B4F]">{pro.name}</p>
                      <p className="text-xs text-[#64748B]">
                        {pro.count} atendimentos ativos
                      </p>
                    </div>
                    <span className="font-extrabold text-[#2563EB]">
                      {formatCurrencyBRL(pro.revenueCents)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Base de Clientes & Comissões
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl bg-[#F5F7FA] p-3">
              <p className="text-[#64748B]">Clientes ativos</p>
              <p className="mt-1 text-xl font-extrabold text-[#142B4F]">
                {data.clients.active}
              </p>
            </div>
            <div className="rounded-xl bg-[#F5F7FA] p-3">
              <p className="text-[#64748B]">Consentimento LGPD</p>
              <p className="mt-1 text-xl font-extrabold text-emerald-700">
                {data.clients.withLgpdConsent}
              </p>
            </div>
            <div className="rounded-xl bg-[#F5F7FA] p-3">
              <p className="text-[#64748B]">Comissões pendentes</p>
              <p className="mt-1 text-lg font-extrabold text-[#C2410C]">
                {formatCurrencyBRL(data.commissions.pendingCents)}
              </p>
            </div>
            <div className="rounded-xl bg-[#F5F7FA] p-3">
              <p className="text-[#64748B]">Comissões pagas</p>
              <p className="mt-1 text-lg font-extrabold text-emerald-700">
                {formatCurrencyBRL(data.commissions.paidCents)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CSV Exports */}
      {canExport && (
        <Card className="print:hidden">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Download className="h-4 w-4 text-[#2563EB]" />
              Exportação de Dados (Excel / CSV UTF-8)
            </CardTitle>
            <CardDescription>
              Arquivos com proteção contra CSV Injection e registro automático em auditoria.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {EXPORT_OPTIONS.map((opt) => (
              <Button key={opt.key} variant="outline" size="sm" asChild>
                <a href={`/api/reports/export?entity=${opt.key}`} download>
                  <Download className="h-3.5 w-3.5" />
                  {opt.label}
                </a>
              </Button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* CSV Client Import with Preview */}
      {canImportClients && (
        <Card className="print:hidden">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Upload className="h-4 w-4 text-[#FF914D]" />
              Importação de Clientes via CSV (com Pré-visualização)
            </CardTitle>
            <CardDescription>
              Cole linhas no formato <code>nome;telefone;email</code> (uma por linha) para validar antes de importar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <textarea
              rows={4}
              placeholder={"nome;telefone;email\nMaria Souza;(11) 99999-1111;maria@exemplo.com\nJoão Lima;(11) 98888-2222;joao@exemplo.com"}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white p-3 font-mono text-xs text-[#142B4F]"
            />

            {preview.length > 0 && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="success">{validCount} válidos</Badge>
                  {invalidCount > 0 && (
                    <Badge variant="destructive">{invalidCount} inválidos</Badge>
                  )}
                </div>

                <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 text-xs">
                  {preview.slice(0, 20).map((row) => (
                    <div
                      key={row.lineNumber}
                      className="flex items-center justify-between px-3 py-2"
                    >
                      <span>
                        L{row.lineNumber}: <strong>{row.name || "(vazio)"}</strong>{" "}
                        {row.phone} {row.email}
                      </span>
                      {row.valid ? (
                        <span className="font-semibold text-emerald-700">OK</span>
                      ) : (
                        <span className="font-semibold text-red-600">{row.error}</span>
                      )}
                    </div>
                  ))}
                </div>

                <Button
                  size="sm"
                  onClick={handleImport}
                  disabled={importing || validCount === 0}
                >
                  {importing && <Loader2 className="h-4 w-4 animate-spin" />}
                  Importar {validCount} clientes válidos
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

