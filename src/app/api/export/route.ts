import { NextRequest, NextResponse } from "next/server";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import {
  appointments,
  appointmentServices,
  clients,
  financialAccounts,
  financialCategories,
  financialTransactions,
  professionals,
} from "@/db/schema";
import { requirePermission } from "@/lib/tenant/context";
import { escapeCsvCell } from "@/modules/reports/csv";

function toCommaCsv(
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][]
): string {
  const headerLine = headers.map(escapeCsvCell).join(",");
  const dataLines = rows.map((row) => row.map(escapeCsvCell).join(","));
  return `\uFEFF${[headerLine, ...dataLines].join("\r\n")}`;
}

function formatCentsToReais(cents: number): string {
  return (cents / 100).toFixed(2);
}

function formatDateTimeBR(date: Date | null): string {
  if (!date) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type");
  const todayStamp = new Date().toISOString().slice(0, 10);

  try {
    const db = getDb();

    if (type === "clients") {
      const ctx = await requirePermission("clients:read");
      const rows = await db
        .select()
        .from(clients)
        .where(
          and(
            eq(clients.organizationId, ctx.organizationId),
            isNull(clients.deletedAt)
          )
        )
        .orderBy(asc(clients.name));

      const csv = toCommaCsv(
        [
          "ID",
          "Nome",
          "CPF",
          "Telefone",
          "WhatsApp",
          "E-mail",
          "Data de Nascimento",
          "Endereço",
          "Origem",
          "Tags",
          "Status",
          "Observações",
          "Criado em",
        ],
        rows.map((c) => [
          c.id,
          c.name,
          c.cpf ?? "",
          c.phone ?? "",
          c.whatsapp ?? "",
          c.email ?? "",
          c.birthDate ?? "",
          c.address ?? "",
          c.origin ?? "",
          (c.tags ?? []).join(" | "),
          c.status,
          c.notes ?? "",
          formatDateTimeBR(c.createdAt),
        ])
      );

      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="agendai-clientes-${todayStamp}.csv"`,
          "Cache-Control": "no-store",
        },
      });
    }

    if (type === "financial") {
      const ctx = await requirePermission("financial:read");
      const rows = await db
        .select({
          id: financialTransactions.id,
          type: financialTransactions.type,
          description: financialTransactions.description,
          amountCents: financialTransactions.amountCents,
          discountCents: financialTransactions.discountCents,
          paidAmountCents: financialTransactions.paidAmountCents,
          status: financialTransactions.status,
          paymentMethod: financialTransactions.paymentMethod,
          dueDate: financialTransactions.dueDate,
          paidAt: financialTransactions.paidAt,
          accountName: financialAccounts.name,
          categoryName: financialCategories.name,
          clientName: clients.name,
          notes: financialTransactions.notes,
          createdAt: financialTransactions.createdAt,
        })
        .from(financialTransactions)
        .leftJoin(
          financialAccounts,
          eq(financialTransactions.accountId, financialAccounts.id)
        )
        .leftJoin(
          financialCategories,
          eq(financialTransactions.categoryId, financialCategories.id)
        )
        .leftJoin(clients, eq(financialTransactions.clientId, clients.id))
        .where(
          and(
            eq(financialTransactions.organizationId, ctx.organizationId),
            isNull(financialTransactions.deletedAt)
          )
        )
        .orderBy(desc(financialTransactions.dueDate));

      const csv = toCommaCsv(
        [
          "ID",
          "Tipo",
          "Descrição",
          "Cliente",
          "Categoria",
          "Conta",
          "Forma de Pagamento",
          "Status",
          "Valor (R$)",
          "Desconto (R$)",
          "Valor Pago (R$)",
          "Vencimento",
          "Pago em",
          "Observações",
        ],
        rows.map((t) => [
          t.id,
          t.type,
          t.description,
          t.clientName ?? "",
          t.categoryName ?? "",
          t.accountName ?? "",
          t.paymentMethod,
          t.status,
          formatCentsToReais(t.amountCents),
          formatCentsToReais(t.discountCents),
          formatCentsToReais(t.paidAmountCents),
          t.dueDate,
          formatDateTimeBR(t.paidAt),
          t.notes ?? "",
        ])
      );

      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="agendai-financeiro-${todayStamp}.csv"`,
          "Cache-Control": "no-store",
        },
      });
    }

    if (type === "open_appointments") {
      const ctx = await requirePermission("appointments:read");
      const rows = await db
        .select({
          id: appointments.id,
          clientName: clients.name,
          clientPhone: clients.whatsapp,
          clientPhoneAlt: clients.phone,
          professionalName: professionals.name,
          startsAt: appointments.startsAt,
          endsAt: appointments.endsAt,
          durationMinutes: appointments.durationMinutes,
          totalPriceCents: appointments.totalPriceCents,
          status: appointments.status,
          recurrenceRule: appointments.recurrenceRule,
          notes: appointments.notes,
        })
        .from(appointments)
        .innerJoin(clients, eq(appointments.clientId, clients.id))
        .innerJoin(
          professionals,
          eq(appointments.professionalId, professionals.id)
        )
        .where(
          and(
            eq(appointments.organizationId, ctx.organizationId),
            isNull(appointments.deletedAt),
            inArray(appointments.status, [
              "waiting",
              "confirmed",
              "in_progress",
            ])
          )
        )
        .orderBy(asc(appointments.startsAt));

      const apptIds = rows.map((r) => r.id);
      const serviceLinks =
        apptIds.length > 0
          ? await db
              .select({
                appointmentId: appointmentServices.appointmentId,
                serviceName: appointmentServices.serviceNameSnapshot,
              })
              .from(appointmentServices)
              .where(
                and(
                  eq(appointmentServices.organizationId, ctx.organizationId),
                  inArray(appointmentServices.appointmentId, apptIds)
                )
              )
          : [];

      const servicesMap = new Map<string, string[]>();
      for (const link of serviceLinks) {
        const list = servicesMap.get(link.appointmentId) ?? [];
        list.push(link.serviceName);
        servicesMap.set(link.appointmentId, list);
      }

      const csv = toCommaCsv(
        [
          "ID",
          "Início",
          "Término",
          "Duração (min)",
          "Cliente",
          "Telefone/WhatsApp",
          "Profissional",
          "Serviços",
          "Valor (R$)",
          "Status",
          "Recorrência",
          "Observações",
        ],
        rows.map((a) => [
          a.id,
          formatDateTimeBR(a.startsAt),
          formatDateTimeBR(a.endsAt),
          a.durationMinutes,
          a.clientName,
          a.clientPhone || a.clientPhoneAlt || "",
          a.professionalName,
          (servicesMap.get(a.id) ?? []).join(" | "),
          formatCentsToReais(a.totalPriceCents),
          a.status,
          a.recurrenceRule ?? "",
          a.notes ?? "",
        ])
      );

      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="agendai-agendamentos-abertos-${todayStamp}.csv"`,
          "Cache-Control": "no-store",
        },
      });
    }

    return NextResponse.json(
      { error: "Tipo de exportação inválido. Use clients, financial ou open_appointments." },
      { status: 400 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao exportar dados.";
    const status = message.toLowerCase().includes("permissão") || message.toLowerCase().includes("autentic") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

