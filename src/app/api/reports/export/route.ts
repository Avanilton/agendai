import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import {
  appointments,
  clients,
  commissions,
  financialTransactions,
  products,
  professionals,
} from "@/db/schema";
import {
  AuthorizationError,
  requirePermission,
} from "@/lib/tenant/context";
import { logAudit } from "@/lib/security/audit";
import { toCsvString } from "@/modules/reports/csv";

const ALLOWED_ENTITIES = new Set([
  "clients",
  "appointments",
  "financial",
  "products",
  "commissions",
]);

export async function GET(request: NextRequest) {
  let ctx;
  try {
    ctx = await requirePermission("reports:export");
  } catch (error) {
    const status =
      error instanceof AuthorizationError ? error.statusCode : 403;
    return NextResponse.json({ error: "Acesso negado." }, { status });
  }

  const entity = request.nextUrl.searchParams.get("entity") ?? "";
  if (!ALLOWED_ENTITIES.has(entity)) {
    return NextResponse.json(
      { error: "Entidade de exportação inválida." },
      { status: 400 }
    );
  }

  const db = getDb();
  let csv = "";
  const orgId = ctx.organizationId;

  if (entity === "clients") {
    const rows = await db
      .select()
      .from(clients)
      .where(and(eq(clients.organizationId, orgId), isNull(clients.deletedAt)));
    csv = toCsvString(
      ["Nome", "Telefone", "WhatsApp", "Email", "Nascimento", "Origem", "Status"],
      rows.map((r) => [
        r.name,
        r.phone,
        r.whatsapp,
        r.email,
        r.birthDate,
        r.origin,
        r.status,
      ])
    );
  } else if (entity === "appointments") {
    const rows = await db
      .select({
        startsAt: appointments.startsAt,
        clientName: clients.name,
        professionalName: professionals.name,
        durationMinutes: appointments.durationMinutes,
        totalPriceCents: appointments.totalPriceCents,
        status: appointments.status,
        source: appointments.source,
      })
      .from(appointments)
      .innerJoin(clients, eq(appointments.clientId, clients.id))
      .innerJoin(professionals, eq(appointments.professionalId, professionals.id))
      .where(
        and(eq(appointments.organizationId, orgId), isNull(appointments.deletedAt))
      )
      .orderBy(desc(appointments.startsAt));

    csv = toCsvString(
      ["Data/Hora", "Cliente", "Profissional", "Duração (min)", "Valor (R$)", "Status", "Origem"],
      rows.map((r) => [
        r.startsAt.toISOString(),
        r.clientName,
        r.professionalName,
        r.durationMinutes,
        (r.totalPriceCents / 100).toFixed(2),
        r.status,
        r.source,
      ])
    );
  } else if (entity === "financial") {
    const rows = await db
      .select()
      .from(financialTransactions)
      .where(
        and(
          eq(financialTransactions.organizationId, orgId),
          isNull(financialTransactions.deletedAt)
        )
      )
      .orderBy(desc(financialTransactions.dueDate));

    csv = toCsvString(
      ["Vencimento", "Tipo", "Descrição", "Valor (R$)", "Pago (R$)", "Status", "Forma Pagamento"],
      rows.map((r) => [
        r.dueDate,
        r.type,
        r.description,
        (r.amountCents / 100).toFixed(2),
        (r.paidAmountCents / 100).toFixed(2),
        r.status,
        r.paymentMethod,
      ])
    );
  } else if (entity === "products") {
    const rows = await db
      .select()
      .from(products)
      .where(and(eq(products.organizationId, orgId), isNull(products.deletedAt)));

    csv = toCsvString(
      ["Produto", "SKU", "Categoria", "Custo (R$)", "Venda (R$)", "Estoque", "Estoque Mínimo"],
      rows.map((r) => [
        r.name,
        r.sku,
        r.category,
        (r.costCents / 100).toFixed(2),
        (r.priceCents / 100).toFixed(2),
        r.stockQuantity,
        r.minStockQuantity,
      ])
    );
  } else if (entity === "commissions") {
    const rows = await db
      .select({
        referenceDate: commissions.referenceDate,
        professionalName: professionals.name,
        description: commissions.description,
        commissionAmountCents: commissions.commissionAmountCents,
        status: commissions.status,
      })
      .from(commissions)
      .innerJoin(professionals, eq(commissions.professionalId, professionals.id))
      .where(eq(commissions.organizationId, orgId))
      .orderBy(desc(commissions.referenceDate));

    csv = toCsvString(
      ["Data Ref.", "Profissional", "Descrição", "Comissão (R$)", "Status"],
      rows.map((r) => [
        r.referenceDate,
        r.professionalName,
        r.description,
        (r.commissionAmountCents / 100).toFixed(2),
        r.status,
      ])
    );
  }

  await logAudit({
    organizationId: orgId,
    actorUserId: ctx.userId,
    action: "report.exported",
    resourceType: "report",
    metadata: { entity, format: "csv" },
  });

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="agendai-${entity}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

