import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export const organizationStatusEnum = pgEnum("organization_status", [
  "trial",
  "active",
  "suspended",
  "cancelled",
]);

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    segment: text("segment").notNull(),
    document: text("document"),
    phone: text("phone"),
    email: text("email"),
    address: text("address"),
    timezone: text("timezone").notNull().default("America/Sao_Paulo"),
    status: organizationStatusEnum("status").notNull().default("trial"),
    onboardingCompletedAt: timestamp("onboarding_completed_at", {
      withTimezone: true,
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
    index("organizations_slug_idx").on(table.slug),
    index("organizations_status_idx").on(table.status),
  ]
);

