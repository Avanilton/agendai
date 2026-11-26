import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import {
  memberships,
  permissions,
  plans,
  professionals,
  rolePermissions,
  roles,
  subscriptions,
  users,
} from "@/db/schema";
import {
  DEFAULT_ROLE_TEMPLATES,
  PERMISSION_CATALOG,
} from "@/lib/permissions/catalog";

export interface RoleWithPermissions {
  id: string;
  slug: string;
  name: string;
  description: string;
  isSystem: boolean;
  permissionCodes: string[];
}

export interface OrganizationMemberRow {
  membershipId: string;
  userId: string;
  userName: string;
  userEmail: string;
  roleId: string;
  roleSlug: string;
  roleName: string;
  status: "active" | "invited" | "suspended";
  linkedProfessionalId: string | null;
}

export interface PermissionsManagementData {
  planName: string;
  planSlug: string;
  maxProfessionals: number;
  roles: RoleWithPermissions[];
  members: OrganizationMemberRow[];
  professionals: { id: string; name: string; userId: string | null }[];
}

export async function ensureCatalogPermissionsSynced() {
  const db = getDb();
  for (const perm of PERMISSION_CATALOG) {
    await db
      .insert(permissions)
      .values({
        code: perm.code,
        module: perm.module,
        description: perm.description,
        isSensitive: perm.isSensitive,
      })
      .onConflictDoUpdate({
        target: permissions.code,
        set: {
          module: perm.module,
          description: perm.description,
          isSensitive: perm.isSensitive,
        },
      });
  }
}

export async function getPermissionsManagementData(
  organizationId: string
): Promise<PermissionsManagementData> {
  const db = getDb();
  await ensureCatalogPermissionsSynced();

  const allPerms = await db.select().from(permissions);
  const permIdByCode = new Map(allPerms.map((p) => [p.code, p.id]));
  const permCodeById = new Map(allPerms.map((p) => [p.id, p.code]));

  // Ensure organization has "admin" and "employee" roles
  const existingRoles = await db
    .select()
    .from(roles)
    .where(eq(roles.organizationId, organizationId))
    .orderBy(asc(roles.createdAt));

  const existingSlugs = new Set(existingRoles.map((r) => r.slug));
  const requiredSlugs = ["admin", "employee"];

  for (const slug of requiredSlugs) {
    if (!existingSlugs.has(slug)) {
      const tpl = DEFAULT_ROLE_TEMPLATES.find((t) => t.slug === slug);
      if (tpl) {
        const [createdRole] = await db
          .insert(roles)
          .values({
            organizationId,
            slug: tpl.slug,
            name: tpl.name,
            description: tpl.description,
            isSystem: true,
          })
          .returning();

        if (createdRole) {
          const permIds = tpl.permissions
            .map((code) => permIdByCode.get(code))
            .filter((id): id is string => Boolean(id));
          if (permIds.length > 0) {
            await db
              .insert(rolePermissions)
              .values(
                permIds.map((permissionId) => ({
                  roleId: createdRole.id,
                  permissionId,
                }))
              )
              .onConflictDoNothing();
          }
          existingRoles.push(createdRole);
        }
      }
    }
  }

  // Ensure owner/admin roles automatically have appointments:read_all
  const readAllPermId = permIdByCode.get("appointments:read_all");
  if (readAllPermId) {
    const adminRoles = existingRoles.filter(
      (r) => r.slug === "owner" || r.slug === "admin"
    );
    if (adminRoles.length > 0) {
      await db
        .insert(rolePermissions)
        .values(
          adminRoles.map((r) => ({
            roleId: r.id,
            permissionId: readAllPermId,
          }))
        )
        .onConflictDoNothing();
    }
  }

  const roleIds = existingRoles.map((r) => r.id);

  const [rpRows, memberRows, profRows, subRows] = await Promise.all([
    roleIds.length > 0
      ? db
          .select()
          .from(rolePermissions)
          .where(inArray(rolePermissions.roleId, roleIds))
      : Promise.resolve([]),
    db
      .select({
        membershipId: memberships.id,
        userId: users.id,
        userName: users.name,
        userEmail: users.email,
        roleId: roles.id,
        roleSlug: roles.slug,
        roleName: roles.name,
        status: memberships.status,
      })
      .from(memberships)
      .innerJoin(users, eq(memberships.userId, users.id))
      .innerJoin(roles, eq(memberships.roleId, roles.id))
      .where(
        and(
          eq(memberships.organizationId, organizationId),
          isNull(users.deletedAt)
        )
      )
      .orderBy(asc(users.name)),
    db
      .select({
        id: professionals.id,
        name: professionals.name,
        userId: professionals.userId,
      })
      .from(professionals)
      .where(
        and(
          eq(professionals.organizationId, organizationId),
          eq(professionals.status, "active"),
          isNull(professionals.deletedAt)
        )
      )
      .orderBy(asc(professionals.name)),
    db
      .select({
        planName: plans.name,
        planSlug: plans.slug,
        maxProfessionals: plans.maxProfessionals,
      })
      .from(subscriptions)
      .innerJoin(plans, eq(subscriptions.planId, plans.id))
      .where(eq(subscriptions.organizationId, organizationId))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1),
  ]);

  const codesByRole = new Map<string, string[]>();
  for (const rp of rpRows) {
    const code = permCodeById.get(rp.permissionId);
    if (!code) continue;
    const list = codesByRole.get(rp.roleId) ?? [];
    list.push(code);
    codesByRole.set(rp.roleId, list);
  }

  const profByUser = new Map<string, string>();
  for (const p of profRows) {
    if (p.userId) {
      profByUser.set(p.userId, p.id);
    }
  }

  // Sort roles: Administrador, Funcionário, Proprietário, then others
  const priorityOrder: Record<string, number> = {
    admin: 1,
    employee: 2,
    owner: 3,
    manager: 4,
    receptionist: 5,
    professional: 6,
  };

  const mappedRoles: RoleWithPermissions[] = [...existingRoles]
    .sort(
      (a, b) =>
        (priorityOrder[a.slug] ?? 99) - (priorityOrder[b.slug] ?? 99) ||
        a.name.localeCompare(b.name)
    )
    .map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      description: r.description,
      isSystem: r.isSystem,
      permissionCodes: codesByRole.get(r.id) ?? [],
    }));

  const mappedMembers: OrganizationMemberRow[] = memberRows.map((m) => ({
    membershipId: m.membershipId,
    userId: m.userId,
    userName: m.userName,
    userEmail: m.userEmail,
    roleId: m.roleId,
    roleSlug: m.roleSlug,
    roleName: m.roleName,
    status: m.status,
    linkedProfessionalId: profByUser.get(m.userId) ?? null,
  }));

  const activePlan = subRows[0];

  return {
    planName: activePlan?.planName ?? "Plano Ativo",
    planSlug: activePlan?.planSlug ?? "profissional",
    maxProfessionals: activePlan?.maxProfessionals ?? 10,
    roles: mappedRoles,
    members: mappedMembers,
    professionals: profRows,
  };
}

