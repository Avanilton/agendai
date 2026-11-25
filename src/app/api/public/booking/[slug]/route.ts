import { NextRequest, NextResponse } from "next/server";
import { publicBookingSubmitSchema } from "@/modules/booking/schemas";
import { createPublicBooking } from "@/modules/booking/service";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Corpo da requisição inválido." },
      { status: 400 }
    );
  }

  const parsed = publicBookingSubmitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );
  }

  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = request.headers.get("user-agent") ?? null;

  try {
    const confirmation = await createPublicBooking({
      slug,
      input: parsed.data,
      ipAddress,
      userAgent,
    });

    return NextResponse.json(
      { success: true, booking: confirmation },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível concluir seu agendamento.",
      },
      { status: 409 }
    );
  }
}

