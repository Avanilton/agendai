import { getDb, hasDatabaseUrl } from "@/db";
import { auditLogs } from "@/db/schema";

const SENSITIVE_KEY_PATTERN =
  /password|secret|token|authorization|cookie|cpf|medical|anamnesis|health|diagnosis|prescription/i;

/**
 * Strips any potentially sensitive or medical keys before writing to audit_logs.
 * LGPD requirement: never store passwords, tokens, or medical data in audit logs.
 */
export function sanitizeAuditMetadata(
  input: Record<string, unknown> | undefined
): Record<string, unknown> {
  if (!input) return {};

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      sanitized[key] = "[REDACTED]";
      continue;
    }

    if (value && typeof value === "object" && !Array.isArray(value)) {
      sanitized[key] = sanitizeAuditMetadata(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

export interface AuditEventInput {
  organizationId?: string | null;
  actorUserId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function logAudit(event: AuditEventInput): Promise<void> {
  if (!hasDatabaseUrl()) {
    return;
  }

  try {
    const db = getDb();
    await db.insert(auditLogs).values({
      organizationId: event.organizationId ?? null,
      actorUserId: event.actorUserId ?? null,
      action: event.action,
      resourceType: event.resourceType,
      resourceId: event.resourceId ?? null,
      metadata: sanitizeAuditMetadata(event.metadata),
      ipAddress: event.ipAddress ?? null,
      userAgent: event.userAgent ?? null,
    });
  } catch (error) {
    // Audit logging must not leak sensitive payloads to stdout
    console.error("[audit] Failed to persist audit event:", event.action, error instanceof Error ? error.message : "unknown");
  }
}

