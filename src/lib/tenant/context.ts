import { headers } from "next/headers";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import {
  memberships,
  organizations,
  permissions,
  rolePermissions,
  roles,
  sessions,
  users,
} from "@/db/schema";
import { getAuth } from "@/lib/auth/auth";
import {
  hasPermission,
  resolveEffectivePermissions,
} from "@/lib/permissions/evaluator";

export class AuthorizationError extends Error {
  constructor(
    message: string,
    public readonly statusCode: 401 | 403 | 404 = 403
  ) {
    super(message);
    this.name = "AuthorizationError";
  }
}

export interface TenantContext {
  userId: string;
  userEmail: string;
  userName: string;
  userImage: string | null;
  userTheme: "light" | "dark";
  userDefaultHomeRoute: string;
  isPlatformAdmin: boolean;
  sessionId: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  organizationStatus: string;
  organizationTimezone: string;
  roleId: string;
  roleSlug: string;
  roleName: string;
  permissions: Set<string>;
}

/**
 * Verifies that a resource's organizationId strictly matches the caller's active tenant.
 * Returns 404 to prevent leaking whether a resource ID exists in another organization.
 */
export function assertTenantOwnership(
  resourceOrganizationId: string | null | undefined,
  activeOrganizationId: string
): void {
  if (!resourceOrganizationId || resourceOrganizationId !== activeOrganizationId) {
    throw new AuthorizationError("Recurso não encontrado.", 404);
  }
}

/**
 * Pure server-side permission check against an already-resolved TenantContext.
 */
export function assertPermission(
  ctx: Pick<TenantContext, "permissions">,
  requiredPermission: string
): void {
  if (!hasPermission(ctx.permissions, requiredPermission)) {
    throw new AuthorizationError(
      "Você não tem permissão para executar esta ação.",
      403
    );
  }
}

export async function getAuthenticatedSession() {
  const auth = getAuth();
  const reqHeaders = await headers();
  return auth.api.getSession({ headers: reqHeaders });
}

/**
 * Resolves the authenticated user + verified active organization membership from PostgreSQL.
 * Never trusts organizationId from client payloads.
 */
export async function requireTenantContext(): Promise<TenantContext> {
  const sessionData = await getAuthenticatedSession();
  if (!sessionData?.user || !sessionData?.session) {
    throw new AuthorizationError("Autenticação obrigatória.", 401);
  }

  const db = getDb();
  const userId = sessionData.user.id;

  const [dbUser] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      image: users.image,
      theme: users.theme,
      defaultHomeRoute: users.defaultHomeRoute,
      isPlatformAdmin: users.isPlatformAdmin,
    })
    .from(users)
    .where(and(eq(users.id, userId), isNull(users.deletedAt)))
    .limit(1);

  if (!dbUser) {
    throw new AuthorizationError("Usuário não encontrado.", 401);
  }

  const [dbSession] = await db
    .select({
      id: sessions.id,
      activeOrganizationId: sessions.activeOrganizationId,
    })
    .from(sessions)
    .where(eq(sessions.id, sessionData.session.id))
    .limit(1);

  const candidateMemberships = await db
    .select({
      membershipId: memberships.id,
      organizationId: organizations.id,
      organizationName: organizations.name,
      organizationSlug: organizations.slug,
      organizationStatus: organizations.status,
      organizationTimezone: organizations.timezone,
      roleId: roles.id,
      roleSlug: roles.slug,
      roleName: roles.name,
      customPermissions: memberships.customPermissions,
    })
    .from(memberships)
    .innerJoin(organizations, eq(memberships.organizationId, organizations.id))
    .innerJoin(roles, eq(memberships.roleId, roles.id))
    .where(
      and(
        eq(memberships.userId, userId),
        eq(memberships.status, "active"),
        isNull(organizations.deletedAt)
      )
    );

  if (candidateMemberships.length === 0) {
    throw new AuthorizationError("Nenhuma organização ativa vinculada.", 403);
  }

  const selected =
    (dbSession?.activeOrganizationId
      ? candidateMemberships.find(
          (m) => m.organizationId === dbSession.activeOrganizationId
        )
      : undefined) ?? candidateMemberships[0]!;

  if (selected.organizationStatus === "suspended" || selected.organizationStatus === "cancelled") {
    throw new AuthorizationError(
      "Esta organização está suspensa ou cancelada.",
      403
    );
  }

  const rolePermRows = await db
    .select({ code: permissions.code })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(rolePermissions.roleId, selected.roleId));

  const effective = resolveEffectivePermissions(
    rolePermRows.map((r) => r.code),
    selected.customPermissions
  );

  return {
    userId: dbUser.id,
    userEmail: dbUser.email,
    userName: dbUser.name,
    userImage: dbUser.image,
    userTheme: dbUser.theme === "dark" ? "dark" : "light",
    userDefaultHomeRoute: dbUser.defaultHomeRoute || "/app",
    isPlatformAdmin: dbUser.isPlatformAdmin,
    sessionId: sessionData.session.id,
    organizationId: selected.organizationId,
    organizationName: selected.organizationName,
    organizationSlug: selected.organizationSlug,
    organizationStatus: selected.organizationStatus,
    organizationTimezone: selected.organizationTimezone,
    roleId: selected.roleId,
    roleSlug: selected.roleSlug,
    roleName: selected.roleName,
    permissions: effective,
  };
}

export async function requirePermission(
  requiredPermission: string
): Promise<TenantContext> {
  const ctx = await requireTenantContext();
  assertPermission(ctx, requiredPermission);
  return ctx;
}

/**
 * Strictly restricts access to Global SaaS Platform Administrators.
 * Tenant owners/admins can NEVER pass this check.
 */
export async function requirePlatformAdmin() {
  const sessionData = await getAuthenticatedSession();
  if (!sessionData?.user) {
    throw new AuthorizationError("Autenticação obrigatória.", 401);
  }

  const db = getDb();
  const [dbUser] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      isPlatformAdmin: users.isPlatformAdmin,
    })
    .from(users)
    .where(and(eq(users.id, sessionData.user.id), isNull(users.deletedAt)))
    .limit(1);

  if (!dbUser || !dbUser.isPlatformAdmin) {
    throw new AuthorizationError(
      "Acesso restrito a administradores globais da plataforma.",
      403
    );
  }

  return dbUser;
}

