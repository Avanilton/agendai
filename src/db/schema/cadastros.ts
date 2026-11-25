import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  date,
  jsonb,
  timestamp,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { users } from "./auth";

export const clientStatusEnum = pgEnum("client_status", [
  "active",
  "inactive",
  "blocked",
]);

export const professionalStatusEnum = pgEnum("professional_status", [
  "active",
  "inactive",
  "vacation",
]);

export const remunerationTypeEnum = pgEnum("remuneration_type", [
  "commission",
  "fixed",
  "hybrid",
]);

export const recordStatusEnum = pgEnum("record_status", ["active", "inactive"]);

export interface ClientContactPreferences {
  whatsapp?: boolean;
  email?: boolean;
  sms?: boolean;
}

export const clients = pgTable(
  "clients",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    cpf: text("cpf"),
    phone: text("phone"),
    whatsapp: text("whatsapp"),
    email: text("email"),
    birthDate: date("birth_date"),
    address: text("address"),
    notes: text("notes"),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    origin: text("origin"),
    status: clientStatusEnum("status").notNull().default("active"),
    contactPreferences: jsonb("contact_preferences")
      .$type<ClientContactPreferences>()
      .notNull()
      .default({ whatsapp: true, email: true, sms: false }),
    lgpdConsentAt: timestamp("lgpd_consent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("clients_org_name_idx").on(table.organizationId, table.name),
    index("clients_org_status_idx").on(table.organizationId, table.status),
    index("clients_org_phone_idx").on(table.organizationId, table.phone),
    index("clients_org_email_idx").on(table.organizationId, table.email),
    index("clients_org_cpf_idx").on(table.organizationId, table.cpf),
  ]
);

export const professionals = pgTable(
  "professionals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    phone: text("phone"),
    email: text("email"),
    cpf: text("cpf"),
    roleTitle: text("role_title"),
    specialty: text("specialty"),
    hiredAt: date("hired_at"),
    status: professionalStatusEnum("status").notNull().default("active"),
    /** Commission percentage in basis points (e.g. 3000 = 30.00%) */
    defaultCommissionBps: integer("default_commission_bps").notNull().default(0),
    salaryCents: integer("salary_cents").notNull().default(0),
    remunerationType: remunerationTypeEnum("remuneration_type")
      .notNull()
      .default("commission"),
    color: text("color").notNull().default("#2563EB"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("professionals_org_name_idx").on(table.organizationId, table.name),
    index("professionals_org_status_idx").on(table.organizationId, table.status),
  ]
);

export const services = pgTable(
  "services",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    category: text("category"),
    description: text("description"),
    priceCents: integer("price_cents").notNull().default(0),
    durationMinutes: integer("duration_minutes").notNull().default(30),
    bufferMinutes: integer("buffer_minutes").notNull().default(0),
    commissionBps: integer("commission_bps").notNull().default(0),
    color: text("color").notNull().default("#2563EB"),
    status: recordStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("services_org_name_idx").on(table.organizationId, table.name),
    index("services_org_status_idx").on(table.organizationId, table.status),
  ]
);

export const professionalServices = pgTable(
  "professional_services",
  {
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    professionalId: uuid("professional_id")
      .notNull()
      .references(() => professionals.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    customCommissionBps: integer("custom_commission_bps"),
    customDurationMinutes: integer("custom_duration_minutes"),
  },
  (table) => [
    primaryKey({ columns: [table.professionalId, table.serviceId] }),
    index("prof_services_org_idx").on(table.organizationId),
  ]
);

export const suppliers = pgTable(
  "suppliers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    document: text("document"),
    contactName: text("contact_name"),
    phone: text("phone"),
    email: text("email"),
    address: text("address"),
    notes: text("notes"),
    status: recordStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("suppliers_org_name_idx").on(table.organizationId, table.name),
    index("suppliers_org_status_idx").on(table.organizationId, table.status),
  ]
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    supplierId: uuid("supplier_id").references(() => suppliers.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    sku: text("sku"),
    barcode: text("barcode"),
    category: text("category"),
    description: text("description"),
    costCents: integer("cost_cents").notNull().default(0),
    priceCents: integer("price_cents").notNull().default(0),
    stockQuantity: integer("stock_quantity").notNull().default(0),
    minStockQuantity: integer("min_stock_quantity").notNull().default(0),
    status: recordStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("products_org_name_idx").on(table.organizationId, table.name),
    index("products_org_sku_idx").on(table.organizationId, table.sku),
    index("products_org_supplier_idx").on(table.organizationId, table.supplierId),
    index("products_org_status_idx").on(table.organizationId, table.status),
  ]
);

