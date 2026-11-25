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
import { clients } from "./cadastros";
import { financialTransactions } from "./financial";

export const pixChargeStatusEnum = pgEnum("pix_charge_status", [
  "pending",
  "paid",
  "expired",
  "cancelled",
]);

export const taxRegimeEnum = pgEnum("tax_regime", [
  "mei",
  "simples_nacional",
  "lucro_presumido",
  "lucro_real",
]);

export const nfseStatusEnum = pgEnum("nfse_status", [
  "draft",
  "queued",
  "issued",
  "cancelled",
  "error",
]);

export const pixCharges = pgTable(
  "pix_charges",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    clientId: uuid("client_id").references(() => clients.id, {
      onDelete: "set null",
    }),
    transactionId: uuid("transaction_id").references(
      () => financialTransactions.id,
      { onDelete: "set null" }
    ),
    provider: text("provider").notNull().default("manual_br_code"),
    externalChargeId: text("external_charge_id"),
    pixKey: text("pix_key").notNull(),
    amountCents: integer("amount_cents").notNull(),
    brCode: text("br_code").notNull(),
    description: text("description").notNull(),
    status: pixChargeStatusEnum("status").notNull().default("pending"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
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
    index("pix_charges_org_status_idx").on(table.organizationId, table.status),
  ]
);

export const fiscalProfiles = pgTable("fiscal_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .unique()
    .references(() => organizations.id, { onDelete: "cascade" }),
  cnpj: text("cnpj"),
  municipalRegistration: text("municipal_registration"),
  taxRegime: taxRegimeEnum("tax_regime").notNull().default("simples_nacional"),
  defaultServiceCode: text("default_service_code"),
  issRateBps: integer("iss_rate_bps").notNull().default(200), // 2.00%
  provider: text("provider").notNull().default("none"),
  environment: text("environment").notNull().default("sandbox"),
  isConfigured: boolean("is_configured").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const serviceInvoices = pgTable(
  "service_invoices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    clientId: uuid("client_id").references(() => clients.id, {
      onDelete: "set null",
    }),
    transactionId: uuid("transaction_id").references(
      () => financialTransactions.id,
      { onDelete: "set null" }
    ),
    serviceCode: text("service_code"),
    description: text("description").notNull(),
    amountCents: integer("amount_cents").notNull(),
    issRateBps: integer("iss_rate_bps").notNull().default(200),
    status: nfseStatusEnum("status").notNull().default("draft"),
    externalId: text("external_id"),
    invoiceNumber: text("invoice_number"),
    xmlUrl: text("xml_url"),
    pdfUrl: text("pdf_url"),
    errorMessage: text("error_message"),
    issuedAt: timestamp("issued_at", { withTimezone: true }),
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
    index("service_invoices_org_status_idx").on(
      table.organizationId,
      table.status
    ),
  ]
);

