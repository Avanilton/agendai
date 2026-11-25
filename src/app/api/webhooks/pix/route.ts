import { NextRequest, NextResponse } from "next/server";

/**
 * Webhook receiver prepared for certified Pix payment providers (Asaas, Efí, Mercado Pago, etc.).
 * Strictly validates shared secret header before accepting any payload.
 */
export async function POST(request: NextRequest) {
  const configuredSecret = process.env.PIX_WEBHOOK_SECRET;
  const providedSecret = request.headers.get("x-agendai-webhook-secret");

  if (!configuredSecret || providedSecret !== configuredSecret) {
    return NextResponse.json(
      { error: "Webhook signature/secret unauthorized." },
      { status: 401 }
    );
  }

  return NextResponse.json({
    received: true,
    status: "provider_not_bound",
    timestamp: new Date().toISOString(),
  });
}

