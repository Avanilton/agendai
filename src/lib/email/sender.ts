export interface EmailPayload {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Transactional email adapter.
 * Uses Resend HTTP API when RESEND_API_KEY is configured.
 * Falls back to structured server-side console logging in development.
 */
export async function sendTransactionalEmail(payload: EmailPayload): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.EMAIL_FROM?.trim() || "Agendai <onboarding@resend.dev>";

  if (resendApiKey) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [payload.to],
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "unknown error");
      console.error(
        `[Agendai Email] Resend API error (${response.status}): ${errorText}`
      );
      throw new Error("Falha ao enviar e-mail transacional.");
    }

    return;
  }

  if (process.env.NODE_ENV !== "production") {
    console.info(
      `\n================ [Agendai Email Dev] ================\nTo: ${payload.to}\nSubject: ${payload.subject}\n${payload.text}\n=====================================================\n`
    );
    return;
  }

  console.warn(
    `[Agendai Email] RESEND_API_KEY não configurada. E-mail não enviado para assunto: ${payload.subject}`
  );
}
