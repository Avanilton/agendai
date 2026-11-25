import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  date,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { users } from "./auth";
import { professionals, services } from "./cadastros";
import { appointments } from "./agenda";
import { sales } from "./commerce";

export const commissionCalcTypeEnum = pgEnum("commission_calc_type", [
  "percentage",
  "fixed",
]);

export const commissionStatusEnum = pgEnum("commission_status", [
  "pending",
  "paid",
  "cancelled",
]);

export const commissionSourceEnum = pgEnum("commission_source", [
  "service",
  "product_sale",
  "goal_bonus",
  "manual",
]);

export const timeEntryTypeEnum = pgEnum("time_entry_type", [
  "work_hours",
  "overtime",
  "absence",
  "day_off",
  "vacation",
]);

export const commissions = pgTable(
  "commissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    professionalId: uuid("professional_id")
      .notNull()
      .references(() => professionals.id, { onDelete: "cascade" }),
    source: commissionSourceEnum("source").notNull().default("service"),
    calcType: commissionCalcTypeEnum("calc_type").notNull().default("percentage"),
    baseAmountCents: integer("base_amount_cents").notNull().default(0),
    /** Percentage in basis points (e.g. 3000 = 30.00%) */
    rateBps: integer("rate_bps").notNull().default(0),
    commissionAmountCents: integer("commission_amount_cents").notNull(),
    status: commissionStatusEnum("status").notNull().default("pending"),
    referenceDate: date("reference_date").notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    appointmentId: uuid("appointment_id").references(() => appointments.id, {
      onDelete: "set null",
    }),
    saleId: uuid("sale_id").references(() => sales.id, {
      onDelete: "set null",
    }),
    serviceId: uuid("service_id").references(() => services.id, {
      onDelete: "set null",
    }),
    description: text("description").notNull(),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("commissions_org_prof_status_idx").on(
      table.organizationId,
      table.professionalId,
      table.status
    ),
    index("commissions_org_ref_date_idx").on(
      table.organizationId,
      table.referenceDate
    ),
  ]
);

export const teamTimeEntries = pgTable(
  "team_time_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    professionalId: uuid("professional_id")
      .notNull()
      .references(() => professionals.id, { onDelete: "cascade" }),
    type: timeEntryTypeEnum("type").notNull().default("work_hours"),
    entryDate: date("entry_date").notNull(),
    /** Minutes worked or overtime (0 for full-day absence/day_off/vacation) */
    durationMinutes: integer("duration_minutes").notNull().default(0),
    notes: text("notes"),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("time_entries_org_prof_date_idx").on(
      table.organizationId,
      table.professionalId,
      table.entryDate
    ),
  ]
);

export const professionalGoals = pgTable(
  "professional_goals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    professionalId: uuid("professional_id")
      .notNull()
      .references(() => professionals.id, { onDelete: "cascade" }),
    /** YYYY-MM */
    monthKey: text("month_key").notNull(),
    targetRevenueCents: integer("target_revenue_cents").notNull().default(0),
    targetAppointments: integer("target_appointments").notNull().default(0),
    bonusCents: integer("bonus_cents").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("prof_goals_org_month_idx").on(table.organizationId, table.monthKey),
  ]
);

