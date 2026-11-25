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
import { clients, products, professionals, services } from "./cadastros";
import { appointments } from "./agenda";
import { saleItemTypeEnum, sales } from "./commerce";

export const packageStatusEnum = pgEnum("package_status", [
  "active",
  "completed",
  "expired",
  "cancelled",
]);

export const budgetStatusEnum = pgEnum("budget_status", [
  "draft",
  "sent",
  "approved",
  "rejected",
  "expired",
  "converted",
]);

export const clientPackages = pgTable(
  "client_packages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id").references(() => services.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    totalSessions: integer("total_sessions").notNull(),
    usedSessions: integer("used_sessions").notNull().default(0),
    priceCents: integer("price_cents").notNull().default(0),
    expiresAt: date("expires_at"),
    status: packageStatusEnum("status").notNull().default("active"),
    notes: text("notes"),
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
    index("client_packages_org_client_idx").on(
      table.organizationId,
      table.clientId
    ),
    index("client_packages_org_status_idx").on(
      table.organizationId,
      table.status
    ),
  ]
);

export const packageSessions = pgTable(
  "package_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    packageId: uuid("package_id")
      .notNull()
      .references(() => clientPackages.id, { onDelete: "cascade" }),
    professionalId: uuid("professional_id").references(() => professionals.id, {
      onDelete: "set null",
    }),
    appointmentId: uuid("appointment_id").references(() => appointments.id, {
      onDelete: "set null",
    }),
    notes: text("notes"),
    usedAt: timestamp("used_at", { withTimezone: true }).notNull().defaultNow(),
    actorUserId: uuid("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    index("pkg_sessions_org_pkg_idx").on(table.organizationId, table.packageId),
  ]
);

export const budgets = pgTable(
  "budgets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    subtotalCents: integer("subtotal_cents").notNull().default(0),
    discountCents: integer("discount_cents").notNull().default(0),
    totalCents: integer("total_cents").notNull().default(0),
    validUntil: date("valid_until"),
    status: budgetStatusEnum("status").notNull().default("draft"),
    notes: text("notes"),
    convertedSaleId: uuid("converted_sale_id").references(() => sales.id, {
      onDelete: "set null",
    }),
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
    index("budgets_org_status_idx").on(table.organizationId, table.status),
    index("budgets_org_client_idx").on(table.organizationId, table.clientId),
  ]
);

export const budgetItems = pgTable(
  "budget_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    budgetId: uuid("budget_id")
      .notNull()
      .references(() => budgets.id, { onDelete: "cascade" }),
    itemType: saleItemTypeEnum("item_type").notNull(),
    productId: uuid("product_id").references(() => products.id, {
      onDelete: "set null",
    }),
    serviceId: uuid("service_id").references(() => services.id, {
      onDelete: "set null",
    }),
    nameSnapshot: text("name_snapshot").notNull(),
    quantity: integer("quantity").notNull().default(1),
    unitPriceCents: integer("unit_price_cents").notNull().default(0),
    totalCents: integer("total_cents").notNull().default(0),
  },
  (table) => [
    index("budget_items_org_idx").on(table.organizationId),
    index("budget_items_budget_idx").on(table.budgetId),
  ]
);

