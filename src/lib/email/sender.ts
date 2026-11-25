export interface EmailPayload {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Transactional email adapter.
 * Phase 1 uses safe server-side structured logging in development.
 * Phase 5 will wire a managed transactional provider (e.g. Resend/SMTP) with queueing.
 */
export async function sendTransactionalEmail(payload: EmailPayload): Promise<void> {
  if (process.env.NODE_ENV !== "production") {
    console.info(
      `[Agendai Email Dev] To: ${payload.to} | Subject: ${payload.subject}\n${payload.text}`
    );
    return;
  }

  // Production provider integration scheduled for Phase 5 (Comunicação)
  console.warn(
    `[Agendai Email] Transactional provider not configured yet. Queued log for subject: ${payload.subject}`
  );
}

