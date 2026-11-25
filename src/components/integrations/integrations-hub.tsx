"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Copy,
  FileText,
  Loader2,
  MessageCircle,
  Plus,
  QrCode,
  Save,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import {
  createNfseDraftAction,
  createPixChargeAction,
  markPixChargePaidAction,
  saveFiscalProfileAction,
} from "@/modules/integrations/actions";
import { buildWhatsAppUrl } from "@/modules/communications/templates";
import { formatCurrencyBRL, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface PixChargeRow {
  id: string;
  clientName: string | null;
  clientPhone: string | null;
  pixKey: string;
  amountCents: number;
  brCode: string;
  description: string;
  status: "pending" | "paid" | "expired" | "cancelled";
  createdAtIso: string;
}

interface FiscalProfileRow {
  cnpj: string | null;
  municipalRegistration: string | null;
  taxRegime: "mei" | "simples_nacional" | "lucro_presumido" | "lucro_real";
  defaultServiceCode: string | null;
  issRateBps: number;
  provider: string;
  environment: string;
  isConfigured: boolean;
}

interface InvoiceRow {
  id: string;
  clientName: string | null;
  serviceCode: string | null;
  description: string;
  amountCents: number;
  issRateBps: number;
  status: string;
  createdAtIso: string;
}

interface IntegrationsHubProps {
  organizationName: string;
  pixCharges: PixChargeRow[];
  fiscalProfile: FiscalProfileRow | null;
  invoices: InvoiceRow[];
  clients: { id: string; name: string }[];
  canWriteFinancial: boolean;
  canManageSettings: boolean;
}

export function IntegrationsHub({
  organizationName,
  pixCharges,
  fiscalProfile,
  invoices,
  clients,
  canWriteFinancial,
  canManageSettings,
}: IntegrationsHubProps) {
  const router = useRouter();
  const [tab, setTab] = useState<"pix" | "nfse">("pix");

  // Pix form
  const [pixForm, setPixForm] = useState({
    clientId: "",
    pixKey: "",
    amountReais: 0,
    description: "",
  });
  const [creatingPix, setCreatingPix] = useState(false);

  // Fiscal profile form
  const [fiscalForm, setFiscalForm] = useState({
    cnpj: fiscalProfile?.cnpj ?? "",
    municipalRegistration: fiscalProfile?.municipalRegistration ?? "",
    taxRegime: fiscalProfile?.taxRegime ?? ("simples_nacional" as const),
    defaultServiceCode: fiscalProfile?.defaultServiceCode ?? "",
    issRatePercent: (fiscalProfile?.issRateBps ?? 200) / 100,
    provider: fiscalProfile?.provider ?? "none",
    environment: fiscalProfile?.environment ?? "sandbox",
  });
  const [savingFiscal, setSavingFiscal] = useState(false);

  // NFS-e draft form
  const [nfseForm, setNfseForm] = useState({
    clientId: "",
    serviceCode: fiscalProfile?.defaultServiceCode ?? "",
    description: "",
    amountReais: 0,
    issRatePercent: (fiscalProfile?.issRateBps ?? 200) / 100,
  });
  const [creatingNfse, setCreatingNfse] = useState(false);

  async function handleCreatePix(e: React.FormEvent) {
    e.preventDefault();
    setCreatingPix(true);
    const res = await createPixChargeAction(pixForm);
    setCreatingPix(false);
    if (!res.success) {
      toast.error(res.error || "Erro ao gerar Pix.");
      return;
    }
    toast.success("Pix Copia e Cola gerado com padrão BACEN!");
    setPixForm((p) => ({ ...p, amountReais: 0, description: "" }));
    router.refresh();
  }

  async function handleCopyBrCode(brCode: string) {
    await navigator.clipboard.writeText(brCode);
    toast.success("Código Pix Copia e Cola copiado!");
  }

  async function handleMarkPixPaid(chargeId: string) {
    const res = await markPixChargePaidAction(chargeId);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    toast.success("Cobrança Pix marcada como paga!");
    router.refresh();
  }

  async function handleSaveFiscal(e: React.FormEvent) {
    e.preventDefault();
    setSavingFiscal(true);
    const res = await saveFiscalProfileAction(fiscalForm);
    setSavingFiscal(false);
    if (!res.success) {
      toast.error(res.error || "Erro ao salvar perfil fiscal.");
      return;
    }
    toast.success("Configuração fiscal salva!");
    router.refresh();
  }

  async function handleCreateNfseDraft(e: React.FormEvent) {
    e.preventDefault();
    setCreatingNfse(true);
    const res = await createNfseDraftAction(nfseForm);
    setCreatingNfse(false);
    if (!res.success) {
      toast.error(res.error || "Erro ao preparar NFS-e.");
      return;
    }
    toast.success("Rascunho de NFS-e salvo (pronto para provedor fiscal homologado).");
    setNfseForm((p) => ({ ...p, description: "", amountReais: 0 }));
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
        <button
          type="button"
          onClick={() => setTab("pix")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold cursor-pointer",
            tab === "pix"
              ? "bg-[#2563EB] text-white"
              : "text-[#64748B] hover:text-[#142B4F]"
          )}
        >
          <QrCode className="h-3.5 w-3.5" />
          Pix e Cobranças
        </button>
        <button
          type="button"
          onClick={() => setTab("nfse")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold cursor-pointer",
            tab === "nfse"
              ? "bg-[#2563EB] text-white"
              : "text-[#64748B] hover:text-[#142B4F]"
          )}
        >
          <FileText className="h-3.5 w-3.5" />
          Nota Fiscal (NFS-e)
        </button>
      </div>

      {/* TAB 1: PIX */}
      {tab === "pix" && (
        <div className="space-y-6">
          {canWriteFinancial && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Gerar Cobrança Pix Copia e Cola (Padrão BACEN EMVCo)
                </CardTitle>
                <CardDescription>
                  Gere códigos Pix válidos com CRC16-CCITT usando a chave Pix da empresa e envie direto no WhatsApp.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={handleCreatePix}
                  className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
                >
                  <Input
                    placeholder="Chave Pix (CPF, CNPJ, e-mail, tel)"
                    value={pixForm.pixKey}
                    onChange={(e) => setPixForm({ ...pixForm, pixKey: e.target.value })}
                    required
                  />
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="Valor (R$)"
                    value={pixForm.amountReais || ""}
                    onChange={(e) =>
                      setPixForm({ ...pixForm, amountReais: Number(e.target.value) })
                    }
                    required
                  />
                  <Input
                    placeholder="Descrição da cobrança"
                    value={pixForm.description}
                    onChange={(e) =>
                      setPixForm({ ...pixForm, description: e.target.value })
                    }
                    required
                  />
                  <div className="flex gap-2">
                    <select
                      value={pixForm.clientId}
                      onChange={(e) =>
                        setPixForm({ ...pixForm, clientId: e.target.value })
                      }
                      className="h-10 flex-1 rounded-lg border border-slate-300 bg-white px-2 text-xs text-[#142B4F]"
                    >
                      <option value="">Cliente (opc.)</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <Button type="submit" disabled={creatingPix}>
                      {creatingPix ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                      Gerar
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="space-y-3">
            {pixCharges.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center text-sm text-[#64748B]">
                  Nenhuma cobrança Pix gerada ainda.
                </CardContent>
              </Card>
            ) : (
              pixCharges.map((ch) => {
                const waMsg = `Olá${ch.clientName ? `, ${ch.clientName}` : ""}! Segue o Pix Copia e Cola da ${organizationName} (${ch.description}) no valor de ${formatCurrencyBRL(
                  ch.amountCents
                )}:\n\n${ch.brCode}`;
                const waUrl = buildWhatsAppUrl(ch.clientPhone, waMsg);
                return (
                  <Card key={ch.id}>
                    <CardContent className="p-4 space-y-2.5">
                      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-sm text-[#142B4F]">
                              {ch.description}
                            </p>
                            <Badge variant={ch.status === "paid" ? "success" : "orange"}>
                              {ch.status === "paid" ? "Pago" : "Aguardando"}
                            </Badge>
                          </div>
                          <p className="text-xs text-[#64748B]">
                            {ch.clientName ? `${ch.clientName} • ` : ""}
                            {new Date(ch.createdAtIso).toLocaleString("pt-BR")}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-base font-extrabold text-[#142B4F]">
                            {formatCurrencyBRL(ch.amountCents)}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCopyBrCode(ch.brCode)}
                          >
                            <Copy className="h-3.5 w-3.5" />
                            Copiar Pix
                          </Button>
                          {waUrl && (
                            <Button size="sm" variant="secondary" asChild>
                              <a href={waUrl} target="_blank" rel="noopener noreferrer">
                                <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                                WhatsApp
                              </a>
                            </Button>
                          )}
                          {canWriteFinancial && ch.status === "pending" && (
                            <Button
                              size="sm"
                              onClick={() => handleMarkPixPaid(ch.id)}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Confirmar Pago
                            </Button>
                          )}
                        </div>
                      </div>
                      <code className="block truncate rounded-lg bg-[#F5F7FA] px-3 py-1.5 text-[11px] text-[#64748B]">
                        {ch.brCode}
                      </code>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: NFS-e */}
      {tab === "nfse" && (
        <div className="space-y-6">
          <Card className="border-[#2563EB]/30 bg-[#EAF2FF]/50">
            <CardContent className="flex items-center gap-3 p-4 text-xs text-[#142B4F]">
              <ShieldCheck className="h-5 w-5 shrink-0 text-[#2563EB]" />
              <span>
                <strong>Arquitetura Fiscal Segura (NFS-e):</strong> o Agendai
                não realiza emissão fiscal improvisada. Configure seus dados
                fiscais e rascunhos aqui; a transmissão oficial ocorre via
                provedor homologado (Focus NFe, eNotas, PlugNotas ou Padrão Nacional)
                após validação contábil.
              </span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Dados Fiscais da Empresa</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveFiscal} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="space-y-1">
                    <Label>CNPJ</Label>
                    <Input
                      placeholder="00.000.000/0001-00"
                      value={fiscalForm.cnpj}
                      disabled={!canManageSettings}
                      onChange={(e) =>
                        setFiscalForm({ ...fiscalForm, cnpj: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Inscrição Municipal</Label>
                    <Input
                      value={fiscalForm.municipalRegistration}
                      disabled={!canManageSettings}
                      onChange={(e) =>
                        setFiscalForm({
                          ...fiscalForm,
                          municipalRegistration: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Regime Tributário</Label>
                    <select
                      value={fiscalForm.taxRegime}
                      disabled={!canManageSettings}
                      onChange={(e) =>
                        setFiscalForm({
                          ...fiscalForm,
                          taxRegime: e.target.value as typeof fiscalForm.taxRegime,
                        })
                      }
                      className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#142B4F]"
                    >
                      <option value="mei">MEI</option>
                      <option value="simples_nacional">Simples Nacional</option>
                      <option value="lucro_presumido">Lucro Presumido</option>
                      <option value="lucro_real">Lucro Real</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="space-y-1">
                    <Label>Código de Serviço (LC 116)</Label>
                    <Input
                      placeholder="Ex.: 04.01"
                      value={fiscalForm.defaultServiceCode}
                      disabled={!canManageSettings}
                      onChange={(e) =>
                        setFiscalForm({
                          ...fiscalForm,
                          defaultServiceCode: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Alíquota ISS (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      value={fiscalForm.issRatePercent}
                      disabled={!canManageSettings}
                      onChange={(e) =>
                        setFiscalForm({
                          ...fiscalForm,
                          issRatePercent: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Provedor Fiscal</Label>
                    <select
                      value={fiscalForm.provider}
                      disabled={!canManageSettings}
                      onChange={(e) =>
                        setFiscalForm({ ...fiscalForm, provider: e.target.value })
                      }
                      className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#142B4F]"
                    >
                      <option value="none">Nenhum (somente rascunho)</option>
                      <option value="nfse_nacional">NFS-e Padrão Nacional</option>
                      <option value="focus_nfe">Focus NFe</option>
                      <option value="enotas">eNotas</option>
                      <option value="plugnotas">PlugNotas</option>
                    </select>
                  </div>
                </div>

                {canManageSettings && (
                  <div className="flex justify-end">
                    <Button type="submit" disabled={savingFiscal}>
                      {savingFiscal ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Salvar perfil fiscal
                    </Button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          {canWriteFinancial && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Preparar Rascunho de NFS-e
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={handleCreateNfseDraft}
                  className="grid grid-cols-1 gap-3 sm:grid-cols-4"
                >
                  <select
                    value={nfseForm.clientId}
                    onChange={(e) =>
                      setNfseForm({ ...nfseForm, clientId: e.target.value })
                    }
                    className="h-10 rounded-lg border border-slate-300 bg-white px-2 text-xs text-[#142B4F]"
                  >
                    <option value="">Tomador / Cliente</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <Input
                    placeholder="Discriminação do serviço"
                    value={nfseForm.description}
                    onChange={(e) =>
                      setNfseForm({ ...nfseForm, description: e.target.value })
                    }
                    required
                  />
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="Valor (R$)"
                    value={nfseForm.amountReais || ""}
                    onChange={(e) =>
                      setNfseForm({
                        ...nfseForm,
                        amountReais: Number(e.target.value),
                      })
                    }
                    required
                  />
                  <Button type="submit" disabled={creatingNfse}>
                    {creatingNfse && <Loader2 className="h-4 w-4 animate-spin" />}
                    Salvar rascunho
                  </Button>
                </form>

                {invoices.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {invoices.map((inv) => (
                      <div
                        key={inv.id}
                        className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-2.5 text-xs"
                      >
                        <div>
                          <p className="font-bold text-[#142B4F]">
                            {inv.description}
                          </p>
                          <p className="text-[#64748B]">
                            {inv.clientName || "Sem tomador"} • ISS{" "}
                            {(inv.issRateBps / 100).toFixed(1)}%
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{inv.status}</Badge>
                          <strong className="text-[#142B4F]">
                            {formatCurrencyBRL(inv.amountCents)}
                          </strong>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

