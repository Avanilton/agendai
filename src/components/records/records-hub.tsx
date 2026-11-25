"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  FileHeart,
  FilePlus2,
  Loader2,
  Lock,
  Plus,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { RecordFieldDefinition } from "@/db/schema/records";
import {
  createClientRecordAction,
  createRecordTemplateAction,
} from "@/modules/records/actions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";

export interface RecordTemplateRow {
  id: string;
  name: string;
  category: string;
  description: string | null;
  fields: RecordFieldDefinition[];
  version: number;
  isSensitive: boolean;
}

export interface ClientRecordRow {
  id: string;
  clientId: string;
  clientName: string;
  professionalName: string | null;
  templateNameSnapshot: string;
  category: string;
  version: number;
  answers: Record<string, string | boolean>;
  notes: string | null;
  createdAtIso: string;
}

interface RecordsHubProps {
  templates: RecordTemplateRow[];
  records: ClientRecordRow[];
  clients: { id: string; name: string }[];
  professionals: { id: string; name: string }[];
  canWrite: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  anamnesis: "Anamnese",
  medical: "Ficha Médica",
  dental: "Odontológica",
  aesthetic: "Estética",
  evaluation: "Avaliação",
  photography: "Fotografia",
  attendance: "Atendimento",
  consent: "Termo de Consentimento",
};

export function RecordsHub({
  templates,
  records,
  clients,
  professionals,
  canWrite,
}: RecordsHubProps) {
  const router = useRouter();
  const [tab, setTab] = useState<"records" | "templates">("records");
  const [clientFilter, setClientFilter] = useState("all");

  // View record detail modal
  const [viewingRecord, setViewingRecord] = useState<ClientRecordRow | null>(null);

  // Fill new record modal
  const [fillModalOpen, setFillModalOpen] = useState(false);
  const [savingRecord, setSavingRecord] = useState(false);
  const [recClientId, setRecClientId] = useState(clients[0]?.id ?? "");
  const [recProfId, setRecProfId] = useState(professionals[0]?.id ?? "");
  const [recTemplateId, setRecTemplateId] = useState(templates[0]?.id ?? "");
  const [recAnswers, setRecAnswers] = useState<Record<string, string | boolean>>({});
  const [recNotes, setRecNotes] = useState("");

  // Create custom template modal
  const [tplModalOpen, setTplModalOpen] = useState(false);
  const [savingTpl, setSavingTpl] = useState(false);
  const [tplName, setTplName] = useState("");
  const [tplCategory, setTplCategory] = useState("anamnesis");
  const [tplDesc, setTplDesc] = useState("");
  const [tplFields, setTplFields] = useState<RecordFieldDefinition[]>([
    { id: "campo_1", label: "Observação principal", type: "textarea", required: true },
  ]);

  const activeTemplate = useMemo(
    () => templates.find((t) => t.id === recTemplateId) ?? null,
    [templates, recTemplateId]
  );

  const visibleRecords = useMemo(() => {
    if (clientFilter === "all") return records;
    return records.filter((r) => r.clientId === clientFilter);
  }, [records, clientFilter]);

  function addTemplateField() {
    setTplFields((prev) => [
      ...prev,
      {
        id: `campo_${prev.length + 1}`,
        label: "",
        type: "text",
        required: false,
      },
    ]);
  }

  async function handleSaveTemplate(e: React.FormEvent) {
    e.preventDefault();
    setSavingTpl(true);
    const res = await createRecordTemplateAction({
      name: tplName,
      category: tplCategory,
      description: tplDesc,
      isSensitive: true,
      fields: tplFields,
    });
    setSavingTpl(false);

    if (!res.success) {
      toast.error(res.error || "Erro ao criar modelo de ficha.");
      return;
    }

    toast.success("Modelo de ficha criado!");
    setTplModalOpen(false);
    setTplName("");
    setTplDesc("");
    setTplFields([
      { id: "campo_1", label: "Observação principal", type: "textarea", required: true },
    ]);
    router.refresh();
  }

  async function handleSaveRecord(e: React.FormEvent) {
    e.preventDefault();
    setSavingRecord(true);
    const res = await createClientRecordAction({
      clientId: recClientId,
      templateId: recTemplateId,
      professionalId: recProfId,
      answers: recAnswers,
      notes: recNotes,
    });
    setSavingRecord(false);

    if (!res.success) {
      toast.error(res.error || "Erro ao salvar ficha.");
      return;
    }

    toast.success("Ficha salva com proteção LGPD e registro de auditoria!");
    setFillModalOpen(false);
    setRecAnswers({});
    setRecNotes("");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* LGPD Security Banner */}
      <Card className="border-[#2563EB]/30 bg-[#EAF2FF]/50">
        <CardContent className="flex items-center gap-3 p-4 text-xs text-[#142B4F]">
          <ShieldCheck className="h-5 w-5 shrink-0 text-[#2563EB]" />
          <span>
            <strong>Área Restrita LGPD (Dados Sensíveis):</strong> acessível
            exclusivamente a perfis com permissão{" "}
            <code>medical_records:read</code>. Todos os acessos e registros são
            auditados sem gravar conteúdo clínico em logs de aplicação.
          </span>
        </CardContent>
      </Card>

      {/* Tabs + Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
          <button
            type="button"
            onClick={() => setTab("records")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold cursor-pointer",
              tab === "records"
                ? "bg-[#2563EB] text-white"
                : "text-[#64748B] hover:text-[#142B4F]"
            )}
          >
            <FileHeart className="h-3.5 w-3.5" />
            Fichas Preenchidas ({records.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("templates")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold cursor-pointer",
              tab === "templates"
                ? "bg-[#2563EB] text-white"
                : "text-[#64748B] hover:text-[#142B4F]"
            )}
          >
            <FilePlus2 className="h-3.5 w-3.5" />
            Modelos da Empresa ({templates.length})
          </button>
        </div>

        {canWrite && (
          <Button
            size="sm"
            onClick={() =>
              tab === "records" ? setFillModalOpen(true) : setTplModalOpen(true)
            }
          >
            <Plus className="h-4 w-4" />
            {tab === "records" ? "Preencher nova ficha" : "Novo modelo de ficha"}
          </Button>
        )}
      </div>

      {/* TAB 1: FILLED RECORDS */}
      {tab === "records" && (
        <div className="space-y-4">
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-[#142B4F]"
          >
            <option value="all">Todos os clientes</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {visibleRecords.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-sm text-[#64748B]">
                Nenhuma ficha ou anamnese registrada ainda.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2.5">
              {visibleRecords.map((rec) => (
                <Card key={rec.id}>
                  <CardContent className="flex flex-col justify-between gap-2 p-4 sm:flex-row sm:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Lock className="h-3.5 w-3.5 text-[#2563EB]" />
                        <p className="font-bold text-sm text-[#142B4F]">
                          {rec.clientName} — {rec.templateNameSnapshot}
                        </p>
                        <Badge variant="default">
                          {CATEGORY_LABELS[rec.category] ?? rec.category}
                        </Badge>
                        <Badge variant="outline">v{rec.version}</Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-[#64748B]">
                        {new Date(rec.createdAtIso).toLocaleString("pt-BR")}
                        {rec.professionalName
                          ? ` • Profissional: ${rec.professionalName}`
                          : ""}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setViewingRecord(rec)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Visualizar
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: TEMPLATES */}
      {tab === "templates" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {templates.map((tpl) => (
            <Card key={tpl.id}>
              <CardContent className="p-5 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-[#142B4F]">{tpl.name}</p>
                    <p className="text-xs text-[#64748B]">{tpl.description}</p>
                  </div>
                  <Badge variant="default">
                    {CATEGORY_LABELS[tpl.category] ?? tpl.category}
                  </Badge>
                </div>
                <p className="text-xs font-medium text-[#2563EB]">
                  {tpl.fields.length} campos configurados • Versão {tpl.version}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* VIEW RECORD DETAIL MODAL */}
      <Modal
        open={Boolean(viewingRecord)}
        onClose={() => setViewingRecord(null)}
        title={
          viewingRecord
            ? `${viewingRecord.templateNameSnapshot} — ${viewingRecord.clientName}`
            : ""
        }
        description={
          viewingRecord
            ? `Registrado em ${new Date(viewingRecord.createdAtIso).toLocaleString("pt-BR")}`
            : undefined
        }
      >
        {viewingRecord && (
          <div className="space-y-3">
            {Object.entries(viewingRecord.answers).map(([key, val]) => (
              <div key={key} className="rounded-xl bg-[#F5F7FA] p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">
                  {key}
                </p>
                <p className="mt-1 text-sm text-[#142B4F] whitespace-pre-line">
                  {typeof val === "boolean" ? (val ? "Sim" : "Não") : val || "—"}
                </p>
              </div>
            ))}
            {viewingRecord.notes && (
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-[11px] font-semibold uppercase text-[#64748B]">
                  Observações adicionais
                </p>
                <p className="mt-1 text-sm text-[#142B4F]">{viewingRecord.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* FILL CLIENT RECORD MODAL */}
      <Modal
        open={fillModalOpen}
        onClose={() => setFillModalOpen(false)}
        title="Preencher ficha / anamnese"
      >
        <form onSubmit={handleSaveRecord} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label>Cliente *</Label>
              <select
                value={recClientId}
                onChange={(e) => setRecClientId(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs text-[#142B4F]"
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
              <Label>Modelo de ficha *</Label>
              <select
                value={recTemplateId}
                onChange={(e) => {
                  setRecTemplateId(e.target.value);
                  setRecAnswers({});
                }}
                className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs text-[#142B4F]"
                required
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Profissional</Label>
              <select
                value={recProfId}
                onChange={(e) => setRecProfId(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs text-[#142B4F]"
              >
                <option value="">Não informado</option>
                {professionals.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {activeTemplate && (
            <div className="space-y-3 rounded-xl border border-slate-200 bg-[#F5F7FA]/60 p-4">
              {activeTemplate.fields.map((field) => (
                <div key={field.id} className="space-y-1">
                  <Label>
                    {field.label} {field.required && "*"}
                  </Label>
                  {field.type === "textarea" ? (
                    <textarea
                      rows={2}
                      required={field.required}
                      value={String(recAnswers[field.id] ?? "")}
                      onChange={(e) =>
                        setRecAnswers((prev) => ({
                          ...prev,
                          [field.id]: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-[#142B4F]"
                    />
                  ) : field.type === "boolean" ? (
                    <label className="flex items-center gap-2 text-xs text-[#142B4F] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(recAnswers[field.id])}
                        onChange={(e) =>
                          setRecAnswers((prev) => ({
                            ...prev,
                            [field.id]: e.target.checked,
                          }))
                        }
                      />
                      Sim
                    </label>
                  ) : (
                    <Input
                      type={field.type === "date" ? "date" : "text"}
                      required={field.required}
                      value={String(recAnswers[field.id] ?? "")}
                      onChange={(e) =>
                        setRecAnswers((prev) => ({
                          ...prev,
                          [field.id]: e.target.value,
                        }))
                      }
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="space-y-1">
            <Label>Observações complementares</Label>
            <Input
              value={recNotes}
              onChange={(e) => setRecNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setFillModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={savingRecord}>
              {savingRecord && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar ficha segura
            </Button>
          </div>
        </form>
      </Modal>

      {/* CREATE TEMPLATE MODAL */}
      <Modal
        open={tplModalOpen}
        onClose={() => setTplModalOpen(false)}
        title="Novo modelo de ficha personalizável"
      >
        <form onSubmit={handleSaveTemplate} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Nome do modelo *</Label>
              <Input
                placeholder="Ex.: Anamnese Estética Facial"
                value={tplName}
                onChange={(e) => setTplName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Categoria</Label>
              <select
                value={tplCategory}
                onChange={(e) => setTplCategory(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#142B4F]"
              >
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Descrição</Label>
            <Input value={tplDesc} onChange={(e) => setTplDesc(e.target.value)} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Perguntas / Campos *</Label>
              <Button type="button" size="sm" variant="secondary" onClick={addTemplateField}>
                + Campo
              </Button>
            </div>

            {tplFields.map((f, idx) => (
              <div key={idx} className="grid grid-cols-12 items-center gap-2">
                <Input
                  placeholder="Pergunta / rótulo"
                  value={f.label}
                  onChange={(e) =>
                    setTplFields((prev) =>
                      prev.map((item, i) =>
                        i === idx ? { ...item, label: e.target.value } : item
                      )
                    )
                  }
                  className="col-span-6 h-9 text-xs"
                  required
                />
                <select
                  value={f.type}
                  onChange={(e) =>
                    setTplFields((prev) =>
                      prev.map((item, i) =>
                        i === idx
                          ? {
                              ...item,
                              type: e.target.value as RecordFieldDefinition["type"],
                            }
                          : item
                      )
                    )
                  }
                  className="col-span-3 h-9 rounded-lg border border-slate-300 bg-white px-2 text-xs"
                >
                  <option value="text">Texto curto</option>
                  <option value="textarea">Texto longo</option>
                  <option value="boolean">Sim / Não</option>
                  <option value="date">Data</option>
                </select>
                <label className="col-span-2 flex items-center gap-1 text-[11px] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={f.required}
                    onChange={(e) =>
                      setTplFields((prev) =>
                        prev.map((item, i) =>
                          i === idx ? { ...item, required: e.target.checked } : item
                        )
                      )
                    }
                  />
                  Obrig.
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setTplFields((prev) => prev.filter((_, i) => i !== idx))
                  }
                  className="col-span-1 flex justify-center text-red-600 cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setTplModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={savingTpl}>
              {savingTpl && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar modelo
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

