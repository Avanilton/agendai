import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { users } from "./auth";
import { clients } from "./cadastros";
import { appointments } from "./agenda";

export const messageChannelEnum = pgEnum("message_channel", [
  "whatsapp",
  "email",
]);

export const messageCategoryEnum = pgEnum("message_category", [
  "confirmation",
  "reminder",
  "cancellation",
  "reschedule",
  "billing",
  "birthday",
  "budget",
  "custom",
]);

export const notificationStatusEnum = pgEnum("notification_status", [
  "pending",
  "queued",
  "sent",
  "failed",
  "cancelled",
]);

export const messageTemplates = pgTable(
  "message_templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    channel: messageChannelEnum("channel").notNull().default("whatsapp"),
    category: messageCategoryEnum("category").notNull().default("reminder"),
    name: text("name").notNull(),
    subject: text("subject"),
    body: text("body").notNull(),
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
    index("msg_templates_org_channel_cat_idx").on(
      table.organizationId,
      table.channel,
      table.category
    ),
  ]
);

export const communicationLogs = pgTable(
  "communication_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    clientId: uuid("client_id").references(() => clients.id, {
      onDelete: "set null",
    }),
    appointmentId: uuid("appointment_id").references(() => appointments.id, {
      onDelete: "set null",
    }),
    templateId: uuid("template_id").references(() => messageTemplates.id, {
      onDelete: "set null",
    }),
    channel: messageChannelEnum("channel").notNull(),
    category: messageCategoryEnum("category").notNull(),
    recipient: text("recipient").notNull(),
    subject: text("subject"),
    renderedBody: text("rendered_body").notNull(),
    status: notificationStatusEnum("status").notNull().default("pending"),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    errorMessage: text("error_message"),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("comm_logs_org_created_idx").on(table.organizationId, table.createdAt),
    index("comm_logs_org_appt_idx").on(table.organizationId, table.appointmentId),
    index("comm_logs_org_status_idx").on(table.organizationId, table.status),
  ]
);

