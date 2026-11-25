import { NextRequest, NextResponse } from "next/server";
import { getPublicAvailableSlots } from "@/modules/booking/service";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const { searchParams } = request.nextUrl;

  const serviceId = searchParams.get("serviceId") ?? "";
  const dateStr = searchParams.get("date") ?? "";
  const professionalId = searchParams.get("professionalId") ?? "any";

  if (!UUID_RE.test(serviceId)) {
    return NextResponse.json(
      { error: "Parâmetro serviceId inválido.", slots: [] },
      { status: 400 }
    );
  }

  if (!DATE_RE.test(dateStr)) {
    return NextResponse.json(
      { error: "Parâmetro date inválido (use YYYY-MM-DD).", slots: [] },
      { status: 400 }
    );
  }

  if (professionalId !== "any" && !UUID_RE.test(professionalId)) {
    return NextResponse.json(
      { error: "Parâmetro professionalId inválido.", slots: [] },
      { status: 400 }
    );
  }

  const result = await getPublicAvailableSlots({
    slug,
    serviceId,
    dateStr,
    professionalId,
  });

  if ("error" in result && result.error) {
    return NextResponse.json(
      { error: result.error, slots: [] },
      { status: 404 }
    );
  }

  // Strictly return only available time strings (never expose client/internal data)
  return NextResponse.json({ slots: result.slots });
}

