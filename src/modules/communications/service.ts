import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { communicationLogs, messageTemplates } from "@/db/schema";
import { assertTenantOwnership } from "@/lib/tenant/context";
import { sendTransactionalEmail } from "@/lib/email/sender";
import { logAudit } from "@/lib/security/audit";
import { DEFAULT_MESSAGE_TEMPLATES } from "./templates";
import type { LogCommunicationInput, TemplateInput } from "./schemas";

export async function ensureDefaultTemplates(organizationId: string) {
  const db = getDb();
  const existing = await db
    .select({ id: messageTemplates.id })
    .from(messageTemplates)
    .where(
      and(
        eq(messageTemplates.organizationId, organizationId),
        isNull(messageTemplates.deletedAt)
      )
    )
    .limit(1);

  if (existing.length > 0) return;

  await db.insert(messageTemplates).values(
    DEFAULT_MESSAGE_TEMPLATES.map((t) => ({
      organizationId,
      channel: t.channel,
      category: t.category,
      name: t.name,
      subject: t.subject,
      body: t.body,
      isActive: true,
    }))
  );
}

export async function listMessageTemplates(organizationId: string) {
  await ensureDefaultTemplates(organizationId);
  const db = getDb();
  return db
    .select()
    .from(messageTemplates)
    .where(
      and(
        eq(messageTemplates.organizationId, organizationId),
        isNull(messageTemplates.deletedAt)
      )
    )
    .orderBy(asc(messageTemplates.channel), asc(messageTemplates.name));
}

export async function createMessageTemplate(params: {
  organizationId: string;
  actorUserId: string;
  input: TemplateInput;
}) {
  const db = getDb();
  const { organizationId, actorUserId, input } = params;

  const [created] = await db
    .insert(messageTemplates)
    .values({
      organizationId,
      channel: input.channel,
      category: input.category,
      name: input.name,
      subject: input.subject || null,
      body: input.body,
      isActive: input.isActive,
    })
    .returning();

  await logAudit({
    organizationId,
    actorUserId,
    action: "template.created",
    resourceType: "message_template",
    resourceId: created?.id ?? null,
    metadata: { channel: input.channel, category: input.category },
  });

  return created!;
}

export async function updateMessageTemplate(params: {
  organizationId: string;
  actorUserId: string;
  templateId: string;
  input: TemplateInput;
}) {
  const db = getDb();
  const { organizationId, actorUserId, templateId, input } = params;

  const [existing] = await db
    .select({
      id: messageTemplates.id,
      organizationId: messageTemplates.organizationId,
    })
    .from(messageTemplates)
    .where(
      and(eq(messageTemplates.id, templateId), isNull(messageTemplates.deletedAt))
    )
    .limit(1);

  assertTenantOwnership(existing?.organizationId, organizationId);

  const [updated] = await db
    .update(messageTemplates)
    .set({
      channel: input.channel,
      category: input.category,
      name: input.name,
      subject: input.subject || null,
      body: input.body,
      isActive: input.isActive,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(messageTemplates.id, templateId),
        eq(messageTemplates.organizationId, organizationId)
      )
    )
    .returning();

  await logAudit({
    organizationId,
    actorUserId,
    action: "template.updated",
    resourceType: "message_template",
    resourceId: templateId,
  });

  return updated!;
}

export async function deleteMessageTemplate(params: {
  organizationId: string;
  actorUserId: string;
  templateId: string;
}) {
  const db = getDb();
  const { organizationId, actorUserId, templateId } = params;

  const [existing] = await db
    .select({
      id: messageTemplates.id,
      organizationId: messageTemplates.organizationId,
    })
    .from(messageTemplates)
    .where(
      and(eq(messageTemplates.id, templateId), isNull(messageTemplates.deletedAt))
    )
    .limit(1);

  assertTenantOwnership(existing?.organizationId, organizationId);

  await db
    .update(messageTemplates)
    .set({ isActive: false, deletedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(messageTemplates.id, templateId),
        eq(messageTemplates.organizationId, organizationId)
      )
    );

  await logAudit({
    organizationId,
    actorUserId,
    action: "template.deleted",
    resourceType: "message_template",
    resourceId: templateId,
  });
}

export async function dispatchAndLogCommunication(params: {
  organizationId: string;
  actorUserId: string;
  input: LogCommunicationInput;
}) {
  const db = getDb();
  const { organizationId, actorUserId, input } = params;

  let status: "sent" | "failed" = "sent";
  let errorMessage: string | null = null;

  if (input.channel === "email") {
    try {
      await sendTransactionalEmail({
        to: input.recipient,
        subject: input.subject || "Mensagem do Agendai",
        text: input.renderedBody,
        html: `<p>${input.renderedBody.replace(/\n/g, "<br/>")}</p>`,
      });
    } catch (err) {
      status = "failed";
      errorMessage =
        err instanceof Error ? err.message : "Falha ao enviar e-mail.";
    }
  }

  const [logged] = await db
    .insert(communicationLogs)
    .values({
      organizationId,
      clientId: input.clientId || null,
      appointmentId: input.appointmentId || null,
      templateId: input.templateId || null,
      channel: input.channel,
      category: input.category,
      recipient: input.recipient,
      subject: input.subject || null,
      renderedBody: input.renderedBody,
      status,
      sentAt: status === "sent" ? new Date() : null,
      errorMessage,
      createdByUserId: actorUserId,
    })
    .returning();

  return logged!;
}

export async function listCommunicationLogs(organizationId: string) {
  const db = getDb();
  return db
    .select()
    .from(communicationLogs)
    .where(eq(communicationLogs.organizationId, organizationId))
    .orderBy(desc(communicationLogs.createdAt))
    .limit(100);
}

