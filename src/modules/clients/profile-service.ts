import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import {
  appointments,
  appointmentServices,
  budgets,
  clientAttachments,
  clientPackages,
  clientRecords,
  clients,
  clientSubscriptions,
  financialAccounts,
  financialCategories,
  financialTransactions,
  professionals,
  recordTemplates,
  saleItems,
  sales,
  subscriptionPlans,
  type RecordAttachment,
  type RecordFieldDefinition,
  type SubscriptionPlanItem,
} from "@/db/schema";
import { assertTenantOwnership } from "@/lib/tenant/context";
import { logAudit } from "@/lib/security/audit";
import type { AppointmentStatus } from "@/modules/agenda/conflicts";

export interface ClientProfileInfo {
  id: string;
  name: string;
  cpf: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  birthDate: string | null;
  address: string | null;
  notes: string | null;
  tags: string[];
  origin: string | null;
  status: "active" | "inactive" | "blocked";
  contactPreferences: { whatsapp?: boolean; email?: boolean; sms?: boolean };
  lgpdConsentAtIso: string | null;
  createdAtIso: string;
}

export interface ClientProfileAppointment {
  id: string;
  professionalId: string;
  professionalName: string;
  professionalColor: string;
  startsAtIso: string;
  endsAtIso: string;
  durationMinutes: number;
  totalPriceCents: number;
  status: AppointmentStatus;
  isOverbooking: boolean;
  recurrenceGroupId: string | null;
  recurrenceRule: string | null;
  notes: string | null;
  services: {
    serviceId: string;
    serviceName: string;
    priceCents: number;
    durationMinutes: number;
  }[];
}

export interface ClientProfileRecord {
  id: string;
  templateId: string | null;
  templateNameSnapshot: string;
  category: string;
  version: number;
  professionalName: string | null;
  answers: Record<string, string | boolean>;
  attachments: RecordAttachment[];
  fieldLabels: Record<string, string>;
  notes: string | null;
  createdAtIso: string;
}

export interface ClientProfileAttachment {
  id: string;
  title: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  dataUrl: string;
  notes: string | null;
  channel: string;
  sentAtIso: string;
}

export interface ClientProfileSubscription {
  id: string;
  planId: string;
  planName: string;
  priceCents: number;
  paymentMethod: string;
  billingDueDay: number;
  status: "active" | "paused" | "cancelled";
  includedItems: SubscriptionPlanItem[];
  notes: string | null;
  startedAtIso: string;
}

export interface ClientProfileTransaction {
  id: string;
  type: "income" | "expense" | "transfer";
  description: string;
  amountCents: number;
  paidAmountCents: number;
  status: "pending" | "paid" | "partial" | "cancelled";
  paymentMethod: string;
  dueDate: string;
  paidAtIso: string | null;
  accountName: string | null;
  categoryName: string | null;
  notes: string | null;
}

export interface ClientProfileSale {
  id: string;
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  paymentMethod: string;
  installments: number;
  status: "completed" | "cancelled";
  notes: string | null;
  createdAtIso: string;
  items: {
    id: string;
    itemType: "product" | "service";
    nameSnapshot: string;
    quantity: number;
    unitPriceCents: number;
    totalCents: number;
  }[];
}

export interface ClientProfilePackage {
  id: string;
  name: string;
  totalSessions: number;
  usedSessions: number;
  priceCents: number;
  expiresAt: string | null;
  status: "active" | "completed" | "expired" | "cancelled";
  notes: string | null;
  createdAtIso: string;
}

export interface ClientProfileBudget {
  id: string;
  title: string;
  totalCents: number;
  validUntil: string | null;
  status: "draft" | "sent" | "approved" | "rejected" | "expired" | "converted";
  notes: string | null;
  createdAtIso: string;
}

export interface ClientFullProfile {
  client: ClientProfileInfo;
  permissions: {
    canReadAppointments: boolean;
    canReadRecords: boolean;
    canReadFinancial: boolean;
  };
  summary: {
    totalAppointments: number;
    completedAppointments: number;
    upcomingAppointments: number;
    totalRecords: number;
    totalPaidCents: number;
    totalPendingCents: number;
    totalSalesCents: number;
  };
  appointments: ClientProfileAppointment[];
  records: ClientProfileRecord[];
  attachments: ClientProfileAttachment[];
  subscriptions: ClientProfileSubscription[];
  transactions: ClientProfileTransaction[];
  sales: ClientProfileSale[];
  packages: ClientProfilePackage[];
  budgets: ClientProfileBudget[];
}

export async function getClientFullProfile(params: {
  organizationId: string;
  actorUserId: string;
  clientId: string;
  canReadAppointments: boolean;
  canReadRecords: boolean;
  canReadFinancial: boolean;
}): Promise<ClientFullProfile> {
  const db = getDb();
  const {
    organizationId,
    actorUserId,
    clientId,
    canReadAppointments,
    canReadRecords,
    canReadFinancial,
  } = params;

  const [clientRow] = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, clientId), isNull(clients.deletedAt)))
    .limit(1);

  assertTenantOwnership(clientRow?.organizationId, organizationId);
  const cli = clientRow!;

  const [
    apptRows,
    recordRows,
    attachmentRows,
    subscriptionRows,
    txRows,
    saleRows,
    pkgRows,
    budgetRows,
  ] = await Promise.all([
    canReadAppointments
      ? db
          .select({
            id: appointments.id,
            professionalId: appointments.professionalId,
            professionalName: professionals.name,
            professionalColor: professionals.color,
            startsAt: appointments.startsAt,
            endsAt: appointments.endsAt,
            durationMinutes: appointments.durationMinutes,
            totalPriceCents: appointments.totalPriceCents,
            status: appointments.status,
            isOverbooking: appointments.isOverbooking,
            recurrenceGroupId: appointments.recurrenceGroupId,
            recurrenceRule: appointments.recurrenceRule,
            notes: appointments.notes,
          })
          .from(appointments)
          .innerJoin(
            professionals,
            eq(appointments.professionalId, professionals.id)
          )
          .where(
            and(
              eq(appointments.organizationId, organizationId),
              eq(appointments.clientId, clientId),
              isNull(appointments.deletedAt)
            )
          )
          .orderBy(desc(appointments.startsAt))
          .limit(250)
      : Promise.resolve([]),
    canReadRecords
      ? db
          .select({
            id: clientRecords.id,
            templateId: clientRecords.templateId,
            templateNameSnapshot: clientRecords.templateNameSnapshot,
            category: clientRecords.category,
            version: clientRecords.version,
            professionalName: professionals.name,
            answers: clientRecords.answers,
            attachments: clientRecords.attachments,
            notes: clientRecords.notes,
            createdAt: clientRecords.createdAt,
            templateFields: recordTemplates.fields,
          })
          .from(clientRecords)
          .leftJoin(
            professionals,
            eq(clientRecords.professionalId, professionals.id)
          )
          .leftJoin(
            recordTemplates,
            eq(clientRecords.templateId, recordTemplates.id)
          )
          .where(
            and(
              eq(clientRecords.organizationId, organizationId),
              eq(clientRecords.clientId, clientId),
              isNull(clientRecords.deletedAt)
            )
          )
          .orderBy(desc(clientRecords.createdAt))
          .limit(100)
      : Promise.resolve([]),
    db
      .select()
      .from(clientAttachments)
      .where(
        and(
          eq(clientAttachments.organizationId, organizationId),
          eq(clientAttachments.clientId, clientId),
          isNull(clientAttachments.deletedAt)
        )
      )
      .orderBy(desc(clientAttachments.sentAt))
      .limit(100),
    db
      .select({
        id: clientSubscriptions.id,
        planId: clientSubscriptions.planId,
        planName: subscriptionPlans.name,
        priceCents: subscriptionPlans.priceCents,
        paymentMethod: clientSubscriptions.paymentMethod,
        billingDueDay: clientSubscriptions.billingDueDay,
        status: clientSubscriptions.status,
        includedItems: subscriptionPlans.includedItems,
        notes: clientSubscriptions.notes,
        startedAt: clientSubscriptions.startedAt,
      })
      .from(clientSubscriptions)
      .innerJoin(
        subscriptionPlans,
        eq(clientSubscriptions.planId, subscriptionPlans.id)
      )
      .where(
        and(
          eq(clientSubscriptions.organizationId, organizationId),
          eq(clientSubscriptions.clientId, clientId),
          isNull(subscriptionPlans.deletedAt)
        )
      )
      .orderBy(desc(clientSubscriptions.startedAt))
      .limit(30),
    canReadFinancial
      ? db
          .select({
            id: financialTransactions.id,
            type: financialTransactions.type,
            description: financialTransactions.description,
            amountCents: financialTransactions.amountCents,
            paidAmountCents: financialTransactions.paidAmountCents,
            status: financialTransactions.status,
            paymentMethod: financialTransactions.paymentMethod,
            dueDate: financialTransactions.dueDate,
            paidAt: financialTransactions.paidAt,
            accountName: financialAccounts.name,
            categoryName: financialCategories.name,
            notes: financialTransactions.notes,
          })
          .from(financialTransactions)
          .leftJoin(
            financialAccounts,
            eq(financialTransactions.accountId, financialAccounts.id)
          )
          .leftJoin(
            financialCategories,
            eq(financialTransactions.categoryId, financialCategories.id)
          )
          .where(
            and(
              eq(financialTransactions.organizationId, organizationId),
              eq(financialTransactions.clientId, clientId),
              isNull(financialTransactions.deletedAt)
            )
          )
          .orderBy(desc(financialTransactions.dueDate))
          .limit(100)
      : Promise.resolve([]),
    canReadFinancial
      ? db
          .select({
            id: sales.id,
            subtotalCents: sales.subtotalCents,
            discountCents: sales.discountCents,
            totalCents: sales.totalCents,
            paymentMethod: sales.paymentMethod,
            installments: sales.installments,
            status: sales.status,
            notes: sales.notes,
            createdAt: sales.createdAt,
          })
          .from(sales)
          .where(
            and(
              eq(sales.organizationId, organizationId),
              eq(sales.clientId, clientId)
            )
          )
          .orderBy(desc(sales.createdAt))
          .limit(100)
      : Promise.resolve([]),
    db
      .select()
      .from(clientPackages)
      .where(
        and(
          eq(clientPackages.organizationId, organizationId),
          eq(clientPackages.clientId, clientId)
        )
      )
      .orderBy(desc(clientPackages.createdAt))
      .limit(50),
    db
      .select()
      .from(budgets)
      .where(
        and(
          eq(budgets.organizationId, organizationId),
          eq(budgets.clientId, clientId)
        )
      )
      .orderBy(desc(budgets.createdAt))
      .limit(50),
  ]);

  // Fetch appointment services and sale items in parallel
  const apptIds = apptRows.map((a) => a.id);
  const saleIds = saleRows.map((s) => s.id);

  const [apptServiceRows, saleItemRows] = await Promise.all([
    apptIds.length > 0
      ? db
          .select({
            appointmentId: appointmentServices.appointmentId,
            serviceId: appointmentServices.serviceId,
            serviceName: appointmentServices.serviceNameSnapshot,
            priceCents: appointmentServices.priceCents,
            durationMinutes: appointmentServices.durationMinutes,
          })
          .from(appointmentServices)
          .where(
            and(
              eq(appointmentServices.organizationId, organizationId),
              inArray(appointmentServices.appointmentId, apptIds)
            )
          )
          .orderBy(asc(appointmentServices.sortOrder))
      : Promise.resolve([]),
    saleIds.length > 0
      ? db
          .select({
            id: saleItems.id,
            saleId: saleItems.saleId,
            itemType: saleItems.itemType,
            nameSnapshot: saleItems.nameSnapshot,
            quantity: saleItems.quantity,
            unitPriceCents: saleItems.unitPriceCents,
            totalCents: saleItems.totalCents,
          })
          .from(saleItems)
          .where(
            and(
              eq(saleItems.organizationId, organizationId),
              inArray(saleItems.saleId, saleIds)
            )
          )
      : Promise.resolve([]),
  ]);

  if (canReadRecords && recordRows.length > 0) {
    await logAudit({
      organizationId,
      actorUserId,
      action: "medical_record.client_profile_accessed",
      resourceType: "client_record",
      resourceId: clientId,
      metadata: { recordCount: recordRows.length },
    });
  }

  const servicesByAppt = new Map<
    string,
    ClientProfileAppointment["services"]
  >();
  for (const row of apptServiceRows) {
    const list = servicesByAppt.get(row.appointmentId) ?? [];
    list.push({
      serviceId: row.serviceId,
      serviceName: row.serviceName,
      priceCents: row.priceCents,
      durationMinutes: row.durationMinutes,
    });
    servicesByAppt.set(row.appointmentId, list);
  }

  const itemsBySale = new Map<string, ClientProfileSale["items"]>();
  for (const row of saleItemRows) {
    const list = itemsBySale.get(row.saleId) ?? [];
    list.push({
      id: row.id,
      itemType: row.itemType,
      nameSnapshot: row.nameSnapshot,
      quantity: row.quantity,
      unitPriceCents: row.unitPriceCents,
      totalCents: row.totalCents,
    });
    itemsBySale.set(row.saleId, list);
  }

  const mappedAppointments: ClientProfileAppointment[] = apptRows.map((a) => ({
    id: a.id,
    professionalId: a.professionalId,
    professionalName: a.professionalName,
    professionalColor: a.professionalColor,
    startsAtIso: a.startsAt.toISOString(),
    endsAtIso: a.endsAt.toISOString(),
    durationMinutes: a.durationMinutes,
    totalPriceCents: a.totalPriceCents,
    status: a.status,
    isOverbooking: a.isOverbooking,
    recurrenceGroupId: a.recurrenceGroupId,
    recurrenceRule: a.recurrenceRule,
    notes: a.notes,
    services: servicesByAppt.get(a.id) ?? [],
  }));

  const mappedRecords: ClientProfileRecord[] = recordRows.map((r) => {
    const fieldLabels: Record<string, string> = {};
    const fields = (r.templateFields ?? []) as RecordFieldDefinition[];
    for (const f of fields) {
      fieldLabels[f.id] = f.label;
    }
    return {
      id: r.id,
      templateId: r.templateId,
      templateNameSnapshot: r.templateNameSnapshot,
      category: r.category,
      version: r.version,
      professionalName: r.professionalName,
      answers: r.answers ?? {},
      attachments: r.attachments ?? [],
      fieldLabels,
      notes: r.notes,
      createdAtIso: r.createdAt.toISOString(),
    };
  });

  const mappedAttachments: ClientProfileAttachment[] = attachmentRows.map(
    (a) => ({
      id: a.id,
      title: a.title,
      fileName: a.fileName,
      mimeType: a.mimeType,
      sizeBytes: a.sizeBytes,
      dataUrl: a.dataUrl,
      notes: a.notes,
      channel: a.channel,
      sentAtIso: a.sentAt.toISOString(),
    })
  );

  const mappedSubscriptions: ClientProfileSubscription[] = subscriptionRows.map(
    (s) => ({
      id: s.id,
      planId: s.planId,
      planName: s.planName,
      priceCents: s.priceCents,
      paymentMethod: s.paymentMethod,
      billingDueDay: s.billingDueDay,
      status: s.status,
      includedItems: s.includedItems ?? [],
      notes: s.notes,
      startedAtIso: s.startedAt.toISOString(),
    })
  );

  const mappedTransactions: ClientProfileTransaction[] = txRows.map((t) => ({
    id: t.id,
    type: t.type,
    description: t.description,
    amountCents: t.amountCents,
    paidAmountCents: t.paidAmountCents,
    status: t.status,
    paymentMethod: t.paymentMethod,
    dueDate: t.dueDate,
    paidAtIso: t.paidAt ? t.paidAt.toISOString() : null,
    accountName: t.accountName,
    categoryName: t.categoryName,
    notes: t.notes,
  }));

  const mappedSales: ClientProfileSale[] = saleRows.map((s) => ({
    id: s.id,
    subtotalCents: s.subtotalCents,
    discountCents: s.discountCents,
    totalCents: s.totalCents,
    paymentMethod: s.paymentMethod,
    installments: s.installments,
    status: s.status,
    notes: s.notes,
    createdAtIso: s.createdAt.toISOString(),
    items: itemsBySale.get(s.id) ?? [],
  }));

  const mappedPackages: ClientProfilePackage[] = pkgRows.map((p) => ({
    id: p.id,
    name: p.name,
    totalSessions: p.totalSessions,
    usedSessions: p.usedSessions,
    priceCents: p.priceCents,
    expiresAt: p.expiresAt,
    status: p.status,
    notes: p.notes,
    createdAtIso: p.createdAt.toISOString(),
  }));

  const mappedBudgets: ClientProfileBudget[] = budgetRows.map((b) => ({
    id: b.id,
    title: b.title,
    totalCents: b.totalCents,
    validUntil: b.validUntil,
    status: b.status,
    notes: b.notes,
    createdAtIso: b.createdAt.toISOString(),
  }));

  const nowMs = Date.now();
  const completedAppointments = mappedAppointments.filter(
    (a) => a.status === "completed"
  ).length;
  const upcomingAppointments = mappedAppointments.filter(
    (a) =>
      (a.status === "waiting" ||
        a.status === "confirmed" ||
        a.status === "in_progress") &&
      new Date(a.endsAtIso).getTime() >= nowMs
  ).length;

  let totalPaidCents = 0;
  let totalPendingCents = 0;
  for (const tx of mappedTransactions) {
    if (tx.type !== "income" || tx.status === "cancelled") continue;
    if (tx.status === "paid") {
      totalPaidCents += tx.paidAmountCents || tx.amountCents;
    } else if (tx.status === "partial") {
      totalPaidCents += tx.paidAmountCents;
      totalPendingCents += Math.max(0, tx.amountCents - tx.paidAmountCents);
    } else {
      totalPendingCents += tx.amountCents;
    }
  }

  const totalSalesCents = mappedSales
    .filter((s) => s.status === "completed")
    .reduce((acc, s) => acc + s.totalCents, 0);

  return {
    client: {
      id: cli.id,
      name: cli.name,
      cpf: cli.cpf,
      phone: cli.phone,
      whatsapp: cli.whatsapp,
      email: cli.email,
      birthDate: cli.birthDate,
      address: cli.address,
      notes: cli.notes,
      tags: cli.tags ?? [],
      origin: cli.origin,
      status: cli.status,
      contactPreferences: cli.contactPreferences ?? {
        whatsapp: true,
        email: true,
        sms: false,
      },
      lgpdConsentAtIso: cli.lgpdConsentAt
        ? cli.lgpdConsentAt.toISOString()
        : null,
      createdAtIso: cli.createdAt.toISOString(),
    },
    permissions: {
      canReadAppointments,
      canReadRecords,
      canReadFinancial,
    },
    summary: {
      totalAppointments: mappedAppointments.length,
      completedAppointments,
      upcomingAppointments,
      totalRecords: mappedRecords.length,
      totalPaidCents,
      totalPendingCents,
      totalSalesCents,
    },
    appointments: mappedAppointments,
    records: mappedRecords,
    attachments: mappedAttachments,
    subscriptions: mappedSubscriptions,
    transactions: mappedTransactions,
    sales: mappedSales,
    packages: mappedPackages,
    budgets: mappedBudgets,
  };
}

export async function createClientAttachment(params: {
  organizationId: string;
  actorUserId: string;
  clientId: string;
  title: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  dataUrl: string;
  notes?: string;
  channel?: string;
}) {
  const db = getDb();
  const { organizationId, actorUserId, clientId } = params;

  const [cli] = await db
    .select({ id: clients.id, organizationId: clients.organizationId })
    .from(clients)
    .where(and(eq(clients.id, clientId), isNull(clients.deletedAt)))
    .limit(1);
  assertTenantOwnership(cli?.organizationId, organizationId);

  const [created] = await db
    .insert(clientAttachments)
    .values({
      organizationId,
      clientId,
      title: params.title,
      fileName: params.fileName,
      mimeType: params.mimeType,
      sizeBytes: params.sizeBytes,
      dataUrl: params.dataUrl,
      notes: params.notes || null,
      channel: params.channel || "whatsapp",
      sentAt: new Date(),
      createdByUserId: actorUserId,
    })
    .returning();

  await logAudit({
    organizationId,
    actorUserId,
    action: "client_attachment.created",
    resourceType: "client_attachment",
    resourceId: created!.id,
    metadata: { clientId, mimeType: params.mimeType, channel: params.channel || "whatsapp" },
  });

  return created!;
}

export async function deleteClientAttachment(params: {
  organizationId: string;
  actorUserId: string;
  attachmentId: string;
}) {
  const db = getDb();
  const { organizationId, actorUserId, attachmentId } = params;

  const [existing] = await db
    .select({
      id: clientAttachments.id,
      organizationId: clientAttachments.organizationId,
      clientId: clientAttachments.clientId,
    })
    .from(clientAttachments)
    .where(
      and(
        eq(clientAttachments.id, attachmentId),
        isNull(clientAttachments.deletedAt)
      )
    )
    .limit(1);

  assertTenantOwnership(existing?.organizationId, organizationId);

  await db
    .update(clientAttachments)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(clientAttachments.id, attachmentId),
        eq(clientAttachments.organizationId, organizationId)
      )
    );

  await logAudit({
    organizationId,
    actorUserId,
    action: "client_attachment.deleted",
    resourceType: "client_attachment",
    resourceId: attachmentId,
  });

  return existing!.clientId;
}

