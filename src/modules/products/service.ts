import { and, asc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { products, suppliers } from "@/db/schema";
import { assertTenantOwnership } from "@/lib/tenant/context";
import { logAudit } from "@/lib/security/audit";
import type { ProductInput } from "./schemas";

export async function listProducts(organizationId: string) {
  const db = getDb();
  return db
    .select({
      id: products.id,
      organizationId: products.organizationId,
      supplierId: products.supplierId,
      supplierName: suppliers.name,
      name: products.name,
      sku: products.sku,
      barcode: products.barcode,
      category: products.category,
      description: products.description,
      costCents: products.costCents,
      priceCents: products.priceCents,
      stockQuantity: products.stockQuantity,
      minStockQuantity: products.minStockQuantity,
      status: products.status,
      createdAt: products.createdAt,
    })
    .from(products)
    .leftJoin(
      suppliers,
      and(
        eq(products.supplierId, suppliers.id),
        eq(suppliers.organizationId, organizationId)
      )
    )
    .where(
      and(
        eq(products.organizationId, organizationId),
        isNull(products.deletedAt)
      )
    )
    .orderBy(asc(products.name));
}

async function assertSupplierBelongsToTenant(
  organizationId: string,
  supplierId?: string
) {
  if (!supplierId) return;
  const db = getDb();
  const [row] = await db
    .select({ id: suppliers.id, organizationId: suppliers.organizationId })
    .from(suppliers)
    .where(and(eq(suppliers.id, supplierId), isNull(suppliers.deletedAt)))
    .limit(1);

  assertTenantOwnership(row?.organizationId, organizationId);
}

export async function createProduct(params: {
  organizationId: string;
  actorUserId: string;
  input: ProductInput;
}) {
  const db = getDb();
  const { organizationId, actorUserId, input } = params;

  await assertSupplierBelongsToTenant(
    organizationId,
    input.supplierId || undefined
  );

  const [created] = await db
    .insert(products)
    .values({
      organizationId,
      supplierId: input.supplierId || null,
      name: input.name,
      sku: input.sku || null,
      barcode: input.barcode || null,
      category: input.category || null,
      description: input.description || null,
      costCents: Math.round(input.costReais * 100),
      priceCents: Math.round(input.priceReais * 100),
      stockQuantity: input.stockQuantity,
      minStockQuantity: input.minStockQuantity,
      status: input.status,
    })
    .returning();

  await logAudit({
    organizationId,
    actorUserId,
    action: "product.created",
    resourceType: "product",
    resourceId: created?.id ?? null,
    metadata: { sku: input.sku || null, category: input.category || null },
  });

  return created!;
}

export async function updateProduct(params: {
  organizationId: string;
  actorUserId: string;
  productId: string;
  input: ProductInput;
}) {
  const db = getDb();
  const { organizationId, actorUserId, productId, input } = params;

  const [existing] = await db
    .select({ id: products.id, organizationId: products.organizationId })
    .from(products)
    .where(and(eq(products.id, productId), isNull(products.deletedAt)))
    .limit(1);

  assertTenantOwnership(existing?.organizationId, organizationId);
  await assertSupplierBelongsToTenant(
    organizationId,
    input.supplierId || undefined
  );

  const [updated] = await db
    .update(products)
    .set({
      supplierId: input.supplierId || null,
      name: input.name,
      sku: input.sku || null,
      barcode: input.barcode || null,
      category: input.category || null,
      description: input.description || null,
      costCents: Math.round(input.costReais * 100),
      priceCents: Math.round(input.priceReais * 100),
      stockQuantity: input.stockQuantity,
      minStockQuantity: input.minStockQuantity,
      status: input.status,
      updatedAt: new Date(),
    })
    .where(
      and(eq(products.id, productId), eq(products.organizationId, organizationId))
    )
    .returning();

  await logAudit({
    organizationId,
    actorUserId,
    action: "product.updated",
    resourceType: "product",
    resourceId: productId,
    metadata: { status: input.status },
  });

  return updated!;
}

export async function deleteProduct(params: {
  organizationId: string;
  actorUserId: string;
  productId: string;
}) {
  const db = getDb();
  const { organizationId, actorUserId, productId } = params;

  const [existing] = await db
    .select({ id: products.id, organizationId: products.organizationId })
    .from(products)
    .where(and(eq(products.id, productId), isNull(products.deletedAt)))
    .limit(1);

  assertTenantOwnership(existing?.organizationId, organizationId);

  await db
    .update(products)
    .set({ status: "inactive", deletedAt: new Date(), updatedAt: new Date() })
    .where(
      and(eq(products.id, productId), eq(products.organizationId, organizationId))
    );

  await logAudit({
    organizationId,
    actorUserId,
    action: "product.deleted",
    resourceType: "product",
    resourceId: productId,
  });
}

