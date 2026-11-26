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
import { clients } from "./cadastros";
import { paymentMethodEnum } from "./financial";

export const clientSubscriptionStatusEnum = pgEnum(
  "client_subscription_status",
  ["active", "paused", "cancelled"]
);

export interface SubscriptionPlanItem {
  itemType: "service" | "product";
  itemId: string;
  nameSnapshot: string;
  quantity: number;
}

export const subscriptionPlans = pgTable(
  "subscription_plans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    priceCents: integer("price_cents").notNull().default(0),
    includedItems: jsonb("included_items")
      .$type<SubscriptionPlanItem[]>()
      .notNull()
      .default([]),
    paymentMethod: paymentMethodEnum("payment_method")
      .notNull()
      .default("pix"),
    /** Day of month (1..31) when payment is due */
    billingDueDay: integer("billing_due_day").notNull().default(10),
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
    index("sub_plans_org_active_idx").on(table.organizationId, table.isActive),
  ]
);

export const clientSubscriptions = pgTable(
  "client_subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    planId: uuid("plan_id")
      .notNull()
      .references(() => subscriptionPlans.id, { onDelete: "restrict" }),
    status: clientSubscriptionStatusEnum("status").notNull().default("active"),
    paymentMethod: paymentMethodEnum("payment_method")
      .notNull()
      .default("pix"),
    billingDueDay: integer("billing_due_day").notNull().default(10),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("client_subs_org_client_idx").on(
      table.organizationId,
      table.clientId
    ),
    index("client_subs_org_plan_idx").on(table.organizationId, table.planId),
  ]
);

