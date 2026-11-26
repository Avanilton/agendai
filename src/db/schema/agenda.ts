import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { users } from "./auth";
import { clients, professionals, services } from "./cadastros";

export const appointmentStatusEnum = pgEnum("appointment_status", [
  "waiting",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
  "no_show",
]);

export const appointmentSourceEnum = pgEnum("appointment_source", [
  "internal",
  "online",
]);

export const scheduleBlockTypeEnum = pgEnum("schedule_block_type", [
  "block",
  "vacation",
  "holiday",
  "break",
]);

export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    professionalId: uuid("professional_id")
      .notNull()
      .references(() => professionals.id, { onDelete: "restrict" }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    totalPriceCents: integer("total_price_cents").notNull().default(0),
    status: appointmentStatusEnum("status").notNull().default("waiting"),
    isOverbooking: boolean("is_overbooking").notNull().default(false),
    source: appointmentSourceEnum("source").notNull().default("internal"),
    recurrenceGroupId: uuid("recurrence_group_id"),
    recurrenceRule: text("recurrence_rule"),
    notes: text("notes"),
    cancellationReason: text("cancellation_reason"),
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
    index("appointments_org_starts_idx").on(table.organizationId, table.startsAt),
    index("appointments_org_prof_range_idx").on(
      table.organizationId,
      table.professionalId,
      table.startsAt,
      table.endsAt
    ),
    index("appointments_org_client_idx").on(table.organizationId, table.clientId),
    index("appointments_org_status_idx").on(table.organizationId, table.status),
  ]
);

export const appointmentServices = pgTable(
  "appointment_services",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    appointmentId: uuid("appointment_id")
      .notNull()
      .references(() => appointments.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "restrict" }),
    serviceNameSnapshot: text("service_name_snapshot").notNull(),
    priceCents: integer("price_cents").notNull().default(0),
    durationMinutes: integer("duration_minutes").notNull().default(30),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    index("appt_services_org_idx").on(table.organizationId),
    index("appt_services_appt_idx").on(table.appointmentId),
  ]
);

export const availabilityRules = pgTable(
  "availability_rules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    /** Null means organization-wide default business hours */
    professionalId: uuid("professional_id").references(() => professionals.id, {
      onDelete: "cascade",
    }),
    /** 0 = Sunday ... 6 = Saturday */
    dayOfWeek: integer("day_of_week").notNull(),
    startTime: text("start_time").notNull().default("08:00"),
    endTime: text("end_time").notNull().default("18:00"),
    breakStartTime: text("break_start_time"),
    breakEndTime: text("break_end_time"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("availability_org_prof_day_idx").on(
      table.organizationId,
      table.professionalId,
      table.dayOfWeek
    ),
  ]
);

export const scheduleBlocks = pgTable(
  "schedule_blocks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    /** Null means organization-wide block (e.g. holiday) */
    professionalId: uuid("professional_id").references(() => professionals.id, {
      onDelete: "cascade",
    }),
    type: scheduleBlockTypeEnum("type").notNull().default("block"),
    title: text("title").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("schedule_blocks_org_range_idx").on(
      table.organizationId,
      table.startsAt,
      table.endsAt
    ),
    index("schedule_blocks_org_prof_idx").on(
      table.organizationId,
      table.professionalId
    ),
  ]
);

export const bookingSettings = pgTable("booking_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .unique()
    .references(() => organizations.id, { onDelete: "cascade" }),
  isEnabled: boolean("is_enabled").notNull().default(true),
  allowAnyProfessional: boolean("allow_any_professional").notNull().default(true),
  minAdvanceMinutes: integer("min_advance_minutes").notNull().default(60),
  maxAdvanceDays: integer("max_advance_days").notNull().default(30),
  slotIntervalMinutes: integer("slot_interval_minutes").notNull().default(30),
  autoConfirm: boolean("auto_confirm").notNull().default(false),
  cancellationPolicyHours: integer("cancellation_policy_hours").notNull().default(24),
  welcomeMessage: text("welcome_message"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

