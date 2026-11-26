import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import {
  clientRecords,
  clients,
  professionals,
  recordTemplates,
  type RecordFieldDefinition,
} from "@/db/schema";
import { assertTenantOwnership } from "@/lib/tenant/context";
import { logAudit } from "@/lib/security/audit";
import {
  validateRequiredAnswers,
  type CreateClientRecordInput,
  type CreateRecordTemplateInput,
} from "./schemas";

const DEFAULT_TEMPLATES: {
  name: string;
  category: "anamnesis" | "evaluation" | "medical";
  description: string;
  fields: RecordFieldDefinition[];
}[] = [
  {
    name: "Anamnese Geral",
    category: "anamnesis",
    description: "Questionário padrão de saúde, alergias e histórico clínico.",
    fields: [
      { id: "queixa", label: "Queixa principal / objetivo do atendimento", type: "textarea", required: true },
      { id: "alergias", label: "Possui alergias conhecidas?", type: "text", required: false },
      { id: "medicamentos", label: "Faz uso contínuo de medicamentos?", type: "text", required: false },
      { id: "gestante", label: "Gestante ou lactante?", type: "boolean", required: false },
    ],
  },
  {
    name: "Prontuário de Atendimento",
    category: "medical",
    description: "Registro de prontuário, evolução clínica, procedimentos realizados e anexos.",
    fields: [
      { id: "historico", label: "Histórico / Evolução do prontuário", type: "textarea", required: true },
      { id: "procedimento", label: "Procedimentos realizados", type: "textarea", required: false },
      { id: "prescricao", label: "Recomendações / Prescrição", type: "textarea", required: false },
    ],
  },
  {
    name: "Ficha de Avaliação e Evolução",
    category: "evaluation",
    description: "Registro técnico de avaliação inicial e acompanhamento.",
    fields: [
      { id: "avaliacao", label: "Avaliação técnica", type: "textarea", required: true },
      { id: "conduta", label: "Conduta / plano de atendimento", type: "textarea", required: true },
      { id: "retorno", label: "Previsão de retorno", type: "date", required: false },
    ],
  },
];

export async function ensureDefaultRecordTemplates(organizationId: string) {
  const db = getDb();
  const existing = await db
    .select({ id: recordTemplates.id })
    .from(recordTemplates)
    .where(
      and(
        eq(recordTemplates.organizationId, organizationId),
        isNull(recordTemplates.deletedAt)
      )
    )
    .limit(1);

  if (existing.length > 0) return;

  await db.insert(recordTemplates).values(
    DEFAULT_TEMPLATES.map((t) => ({
      organizationId,
      name: t.name,
      category: t.category,
      description: t.description,
      fields: t.fields,
      version: 1,
      isSensitive: true,
      isActive: true,
    }))
  );
}

export async function getRecordsWorkspaceData(params: {
  organizationId: string;
  actorUserId: string;
}) {
  const { organizationId, actorUserId } = params;
  await ensureDefaultRecordTemplates(organizationId);
  const db = getDb();

  const [templates, records] = await Promise.all([
    db
      .select()
      .from(recordTemplates)
      .where(
        and(
          eq(recordTemplates.organizationId, organizationId),
          isNull(recordTemplates.deletedAt)
        )
      )
      .orderBy(asc(recordTemplates.name)),
    db
      .select({
        id: clientRecords.id,
        clientId: clientRecords.clientId,
        clientName: clients.name,
        professionalId: clientRecords.professionalId,
        professionalName: professionals.name,
        templateId: clientRecords.templateId,
        templateNameSnapshot: clientRecords.templateNameSnapshot,
        category: clientRecords.category,
        version: clientRecords.version,
        answers: clientRecords.answers,
        attachments: clientRecords.attachments,
        notes: clientRecords.notes,
        createdAt: clientRecords.createdAt,
      })
      .from(clientRecords)
      .innerJoin(clients, eq(clientRecords.clientId, clients.id))
      .leftJoin(
        professionals,
        eq(clientRecords.professionalId, professionals.id)
      )
      .where(
        and(
          eq(clientRecords.organizationId, organizationId),
          isNull(clientRecords.deletedAt)
        )
      )
      .orderBy(desc(clientRecords.createdAt))
      .limit(150),
  ]);

  // LGPD audit trail for accessing sensitive records workspace (zero clinical payload logged)
  await logAudit({
    organizationId,
    actorUserId,
    action: "medical_record.workspace_accessed",
    resourceType: "client_record",
    metadata: { recordCount: records.length },
  });

  return {
    templates,
    records: records.map((r) => ({
      ...r,
      createdAtIso: r.createdAt.toISOString(),
    })),
  };
}

export async function createRecordTemplate(params: {
  organizationId: string;
  actorUserId: string;
  input: CreateRecordTemplateInput;
}) {
  const db = getDb();
  const { organizationId, actorUserId, input } = params;

  const [created] = await db
    .insert(recordTemplates)
    .values({
      organizationId,
      name: input.name,
      category: input.category,
      description: input.description || null,
      fields: input.fields,
      version: 1,
      isSensitive: input.isSensitive,
      isActive: true,
    })
    .returning();

  await logAudit({
    organizationId,
    actorUserId,
    action: "record_template.created",
    resourceType: "record_template",
    resourceId: created!.id,
    metadata: { category: input.category, fieldCount: input.fields.length },
  });

  return created!;
}

export async function createClientRecord(params: {
  organizationId: string;
  actorUserId: string;
  input: CreateClientRecordInput;
}) {
  const db = getDb();
  const { organizationId, actorUserId, input } = params;

  const [cli] = await db
    .select({ id: clients.id, organizationId: clients.organizationId })
    .from(clients)
    .where(and(eq(clients.id, input.clientId), isNull(clients.deletedAt)))
    .limit(1);
  assertTenantOwnership(cli?.organizationId, organizationId);

  const [tpl] = await db
    .select()
    .from(recordTemplates)
    .where(
      and(
        eq(recordTemplates.id, input.templateId),
        isNull(recordTemplates.deletedAt)
      )
    )
    .limit(1);
  assertTenantOwnership(tpl?.organizationId, organizationId);

  if (input.professionalId) {
    const [prof] = await db
      .select({ id: professionals.id, organizationId: professionals.organizationId })
      .from(professionals)
      .where(
        and(
          eq(professionals.id, input.professionalId),
          isNull(professionals.deletedAt)
        )
      )
      .limit(1);
    assertTenantOwnership(prof?.organizationId, organizationId);
  }

  const validation = validateRequiredAnswers(tpl!.fields, input.answers);
  if (!validation.valid) {
    throw new Error(
      `Preencha os campos obrigatórios: ${validation.missingLabels.join(", ")}.`
    );
  }

  const [created] = await db
    .insert(clientRecords)
    .values({
      organizationId,
      clientId: input.clientId,
      templateId: tpl!.id,
      professionalId: input.professionalId || null,
      templateNameSnapshot: tpl!.name,
      category: tpl!.category,
      version: tpl!.version,
      answers: input.answers,
      attachments: input.attachments ?? [],
      notes: input.notes || null,
      createdByUserId: actorUserId,
    })
    .returning();

  // Strictly NO clinical answers or notes in audit_logs (LGPD compliance)
  await logAudit({
    organizationId,
    actorUserId,
    action: "medical_record.created",
    resourceType: "client_record",
    resourceId: created!.id,
    metadata: {
      clientId: input.clientId,
      templateId: tpl!.id,
      category: tpl!.category,
      version: tpl!.version,
    },
  });

  return created!;
}

