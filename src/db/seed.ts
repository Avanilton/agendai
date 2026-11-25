import { getDb } from "./index";
import { plans, permissions } from "./schema";
import { DEFAULT_PLANS_CATALOG } from "./plans-catalog";
import { PERMISSION_CATALOG } from "@/lib/permissions/catalog";

async function seed() {
  const db = getDb();

  console.log("Seeding Agendai commercial plans...");
  for (const plan of DEFAULT_PLANS_CATALOG) {
    await db
      .insert(plans)
      .values({
        slug: plan.slug,
        name: plan.name,
        description: plan.description,
        priceCents: plan.priceCents,
        referencePriceCents: plan.referencePriceCents,
        maxProfessionals: plan.maxProfessionals,
        storageLimitMb: plan.storageLimitMb,
        isPopular: plan.isPopular,
        badgeText: plan.badgeText,
        features: plan.features,
        limits: plan.limits,
        sortOrder: plan.sortOrder,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: plans.slug,
        set: {
          name: plan.name,
          description: plan.description,
          priceCents: plan.priceCents,
          referencePriceCents: plan.referencePriceCents,
          maxProfessionals: plan.maxProfessionals,
          storageLimitMb: plan.storageLimitMb,
          isPopular: plan.isPopular,
          badgeText: plan.badgeText,
          features: plan.features,
          limits: plan.limits,
          sortOrder: plan.sortOrder,
          updatedAt: new Date(),
        },
      });
  }

  console.log("Seeding Agendai RBAC permissions catalog...");
  for (const perm of PERMISSION_CATALOG) {
    await db
      .insert(permissions)
      .values({
        code: perm.code,
        module: perm.module,
        description: perm.description,
        isSensitive: perm.isSensitive,
      })
      .onConflictDoUpdate({
        target: permissions.code,
        set: {
          module: perm.module,
          description: perm.description,
          isSensitive: perm.isSensitive,
        },
      });
  }

  console.log("Agendai seed completed successfully.");
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Failed to seed database:", error);
    process.exit(1);
  });

