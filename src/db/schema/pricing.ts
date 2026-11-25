import {
  pgTable,
  uuid,
  text,
  integer,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { products, services } from "./cadastros";

export const pricingCalculations = pgTable(
  "pricing_calculations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    itemType: text("item_type").notNull(), // "service" | "product"
    serviceId: uuid("service_id").references(() => services.id, {
      onDelete: "set null",
    }),
    productId: uuid("product_id").references(() => products.id, {
      onDelete: "set null",
    }),
    itemName: text("item_name").notNull(),
    inputs: jsonb("inputs").$type<Record<string, number>>().notNull(),
    totalCostCents: integer("total_cost_cents").notNull(),
    minimumPriceCents: integer("minimum_price_cents").notNull(),
    recommendedPriceCents: integer("recommended_price_cents").notNull(),
    estimatedProfitCents: integer("estimated_profit_cents").notNull(),
    realMarginPercent: text("real_margin_percent").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("pricing_calculations_org_idx").on(table.organizationId),
    index("pricing_calculations_org_type_idx").on(
      table.organizationId,
      table.itemType
    ),
  ]
);

