import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  date,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { users } from "./auth";
import { clients, suppliers } from "./cadastros";
import { appointments } from "./agenda";

export const financialAccountTypeEnum = pgEnum("financial_account_type", [
  "cash",
  "checking",
  "savings",
  "digital",
]);

export const financialCategoryTypeEnum = pgEnum("financial_category_type", [
  "income",
  "expense",
]);

export const financialTransactionTypeEnum = pgEnum(
  "financial_transaction_type",
  ["income", "expense", "transfer"]
);

export const financialTransactionStatusEnum = pgEnum(
  "financial_transaction_status",
  ["pending", "paid", "partial", "cancelled"]
);

export const paymentMethodEnum = pgEnum("payment_method", [
  "pix",
  "cash",
  "credit_card",
  "debit_card",
  "bank_transfer",
  "other",
]);

export const financialAccounts = pgTable(
  "financial_accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: financialAccountTypeEnum("type").notNull().default("cash"),
    initialBalanceCents: integer("initial_balance_cents").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [index("fin_accounts_org_idx").on(table.organizationId)]
);

export const financialCategories = pgTable(
  "financial_categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: financialCategoryTypeEnum("type").notNull(),
    color: text("color").notNull().default("#2563EB"),
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
    index("fin_categories_org_type_idx").on(table.organizationId, table.type),
  ]
);

export const costCenters = pgTable(
  "cost_centers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [index("cost_centers_org_idx").on(table.organizationId)]
);

export const financialTransactions = pgTable(
  "financial_transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    type: financialTransactionTypeEnum("type").notNull(),
    description: text("description").notNull(),
    amountCents: integer("amount_cents").notNull(),
    discountCents: integer("discount_cents").notNull().default(0),
    interestCents: integer("interest_cents").notNull().default(0),
    fineCents: integer("fine_cents").notNull().default(0),
    paidAmountCents: integer("paid_amount_cents").notNull().default(0),
    status: financialTransactionStatusEnum("status")
      .notNull()
      .default("pending"),
    paymentMethod: paymentMethodEnum("payment_method")
      .notNull()
      .default("pix"),
    dueDate: date("due_date").notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => financialAccounts.id, { onDelete: "restrict" }),
    destinationAccountId: uuid("destination_account_id").references(
      () => financialAccounts.id,
      { onDelete: "restrict" }
    ),
    categoryId: uuid("category_id").references(() => financialCategories.id, {
      onDelete: "set null",
    }),
    costCenterId: uuid("cost_center_id").references(() => costCenters.id, {
      onDelete: "set null",
    }),
    clientId: uuid("client_id").references(() => clients.id, {
      onDelete: "set null",
    }),
    supplierId: uuid("supplier_id").references(() => suppliers.id, {
      onDelete: "set null",
    }),
    appointmentId: uuid("appointment_id").references(() => appointments.id, {
      onDelete: "set null",
    }),
    installmentGroupId: uuid("installment_group_id"),
    installmentNumber: integer("installment_number").notNull().default(1),
    installmentTotal: integer("installment_total").notNull().default(1),
    isRecurring: boolean("is_recurring").notNull().default(false),
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
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("fin_tx_org_due_idx").on(table.organizationId, table.dueDate),
    index("fin_tx_org_type_status_idx").on(
      table.organizationId,
      table.type,
      table.status
    ),
    index("fin_tx_org_account_idx").on(table.organizationId, table.accountId),
  ]
);

