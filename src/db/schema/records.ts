import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { users } from "./auth";
import { clients, professionals } from "./cadastros";

export const recordCategoryEnum = pgEnum("record_category", [
  "anamnesis",
  "medical",
  "dental",
  "aesthetic",
  "evaluation",
  "photography",
  "attendance",
  "consent",
]);

export interface RecordFieldDefinition {
  id: string;
  label: string;
  type: "text" | "textarea" | "boolean" | "select" | "date";
  required: boolean;
  options?: string[];
}

export interface RecordAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  dataUrl: string;
  uploadedAtIso: string;
}

export const recordTemplates = pgTable(
  "record_templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    category: recordCategoryEnum("category").notNull().default("anamnesis"),
    description: text("description"),
    fields: jsonb("fields").$type<RecordFieldDefinition[]>().notNull().default([]),
    version: integer("version").notNull().default(1),
    isSensitive: boolean("is_sensitive").notNull().default(true),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("record_templates_org_cat_idx").on(
      table.organizationId,
      table.category
    ),
  ]
);

export const clientRecords = pgTable(
  "client_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    templateId: uuid("template_id").references(() => recordTemplates.id, {
      onDelete: "set null",
    }),
    professionalId: uuid("professional_id").references(() => professionals.id, {
      onDelete: "set null",
    }),
    templateNameSnapshot: text("template_name_snapshot").notNull(),
    category: recordCategoryEnum("category").notNull().default("anamnesis"),
    version: integer("version").notNull().default(1),
    answers: jsonb("answers")
      .$type<Record<string, string | boolean>>()
      .notNull()
      .default({}),
    attachments: jsonb("attachments")
      .$type<RecordAttachment[]>()
      .notNull()
      .default([]),
    notes: text("notes"),
    signedAt: timestamp("signed_at", { withTimezone: true }),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("client_records_org_client_idx").on(
      table.organizationId,
      table.clientId,
      table.createdAt
    ),
  ]
);

export const clientAttachments = pgTable(
  "client_attachments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull().default(0),
    dataUrl: text("data_url").notNull(),
    notes: text("notes"),
    channel: text("channel").notNull().default("whatsapp"),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("client_attachments_org_client_idx").on(
      table.organizationId,
      table.clientId,
      table.sentAt
    ),
  ]
);

