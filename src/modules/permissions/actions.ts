"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { z } from "zod";
import { getDb } from "@/db";
import {
  accounts,
  memberships,
  permissions,
  professionals,
  rolePermissions,
  roles,
  users,
} from "@/db/schema";
import {
  assertTenantOwnership,
  requireTenantContext,
} from "@/lib/tenant/context";
import { hasPermission } from "@/lib/permissions/evaluator";
import { logAudit } from "@/lib/security/audit";
import { ensureCatalogPermissionsSynced } from "./service";

async function requirePermissionsAdmin() {
  const ctx = await requireTenantContext();
  if (
    !hasPermission(ctx.permissions, "team:manage") &&
    !hasPermission(ctx.permissions, "settings:manage")
  ) {
    throw new Error("Você não tem permissão para gerenciar perfis e acessos.");
  }
  return ctx;
}

const updateRolePermsSchema = z.object({
  roleId: z.string().uuid(),
  permissionCodes: z.array(z.string().min(1)),
});

export async function updateRolePermissionsAction(input: {
  roleId: string;
  permissionCodes: string[];
}) {
  try {
    const ctx = await requirePermissionsAdmin();
    const parsed = updateRolePermsSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false as const, error: "Dados de permissões inválidos." };
    }

    const db = getDb();
    await ensureCatalogPermissionsSynced();

    const [roleRow] = await db
      .select()
      .from(roles)
      .where(eq(roles.id, parsed.data.roleId))
      .limit(1);

    assertTenantOwnership(roleRow?.organizationId, ctx.organizationId);

    if (roleRow!.slug === "owner") {
      return {
        success: false as const,
        error: "O perfil Proprietário mantém acesso total ao plano por segurança.",
      };
    }

    const uniqueCodes = Array.from(new Set(parsed.data.permissionCodes));
    const permRows =
      uniqueCodes.length > 0
        ? await db
            .select({ id: permissions.id, code: permissions.code })
            .from(permissions)
            .where(inArray(permissions.code, uniqueCodes))
        : [];

    await db
      .delete(rolePermissions)
      .where(eq(rolePermissions.roleId, roleRow!.id));

    if (permRows.length > 0) {
      await db.insert(rolePermissions).values(
        permRows.map((p) => ({
          roleId: roleRow!.id,
          permissionId: p.id,
        }))
      );
    }

    await logAudit({
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      action: "role.permissions_updated",
      resourceType: "role",
      resourceId: roleRow!.id,
      metadata: {
        roleSlug: roleRow!.slug,
        permissionCount: permRows.length,
      },
    });

    revalidatePath("/app", "layout");
    revalidatePath("/app/configuracoes");
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error
          ? error.message
          : "Erro ao atualizar permissões do perfil.",
    };
  }
}

const createMemberSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do usuário.").max(120),
  email: z.string().trim().email("Informe um e-mail válido."),
  password: z
    .string()
    .min(8, "A senha inicial deve ter no mínimo 8 caracteres.")
    .max(128),
  roleId: z.string().uuid("Selecione um perfil."),
  professionalId: z.string().uuid().optional().or(z.literal("")),
});

export async function createOrganizationUserAction(input: {
  name: string;
  email: string;
  password: string;
  roleId: string;
  professionalId?: string;
}) {
  try {
    const ctx = await requirePermissionsAdmin();
    const parsed = createMemberSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false as const,
        error: parsed.error.issues[0]?.message ?? "Dados do usuário inválidos.",
      };
    }

    const db = getDb();
    const normalizedEmail = parsed.data.email.toLowerCase();

    const [roleRow] = await db
      .select()
      .from(roles)
      .where(eq(roles.id, parsed.data.roleId))
      .limit(1);
    assertTenantOwnership(roleRow?.organizationId, ctx.organizationId);

    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    let targetUserId: string;
    const now = new Date();

    if (existingUser) {
      targetUserId = existingUser.id;
      const [existingMembership] = await db
        .select({ id: memberships.id })
        .from(memberships)
        .where(
          and(
            eq(memberships.organizationId, ctx.organizationId),
            eq(memberships.userId, targetUserId)
          )
        )
        .limit(1);

      if (existingMembership) {
        return {
          success: false as const,
          error: "Este e-mail já pertence à equipe desta empresa.",
        };
      }
    } else {
      const hashedPassword = await hashPassword(parsed.data.password);
      const [createdUser] = await db
        .insert(users)
        .values({
          name: parsed.data.name,
          email: normalizedEmail,
          emailVerified: true,
          isPlatformAdmin: false,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      targetUserId = createdUser!.id;

      await db.insert(accounts).values({
        userId: targetUserId,
        accountId: targetUserId,
        providerId: "credential",
        password: hashedPassword,
        createdAt: now,
        updatedAt: now,
      });
    }

    await db.insert(memberships).values({
      organizationId: ctx.organizationId,
      userId: targetUserId,
      roleId: roleRow!.id,
      status: "active",
    });

    if (parsed.data.professionalId) {
      const [prof] = await db
        .select({
          id: professionals.id,
          organizationId: professionals.organizationId,
        })
        .from(professionals)
        .where(
          and(
            eq(professionals.id, parsed.data.professionalId),
            isNull(professionals.deletedAt)
          )
        )
        .limit(1);

      if (prof && prof.organizationId === ctx.organizationId) {
        await db
          .update(professionals)
          .set({ userId: targetUserId, updatedAt: now })
          .where(
            and(
              eq(professionals.id, prof.id),
              eq(professionals.organizationId, ctx.organizationId)
            )
          );
      }
    }

    await logAudit({
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      action: "member.created",
      resourceType: "membership",
      resourceId: targetUserId,
      metadata: { roleSlug: roleRow!.slug },
    });

    revalidatePath("/app/configuracoes");
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error
          ? error.message
          : "Não foi possível criar o usuário.",
    };
  }
}

const updateMemberSchema = z.object({
  membershipId: z.string().uuid(),
  roleId: z.string().uuid(),
  professionalId: z.string().uuid().optional().or(z.literal("")),
  status: z.enum(["active", "suspended"]),
});

export async function updateMemberAccessAction(input: {
  membershipId: string;
  roleId: string;
  professionalId?: string;
  status: "active" | "suspended";
}) {
  try {
    const ctx = await requirePermissionsAdmin();
    const parsed = updateMemberSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false as const, error: "Dados inválidos." };
    }

    const db = getDb();
    const [memberRow] = await db
      .select()
      .from(memberships)
      .where(eq(memberships.id, parsed.data.membershipId))
      .limit(1);

    assertTenantOwnership(memberRow?.organizationId, ctx.organizationId);

    if (memberRow!.userId === ctx.userId && parsed.data.status === "suspended") {
      return {
        success: false as const,
        error: "Você não pode suspender o seu próprio acesso.",
      };
    }

    const [roleRow] = await db
      .select()
      .from(roles)
      .where(eq(roles.id, parsed.data.roleId))
      .limit(1);
    assertTenantOwnership(roleRow?.organizationId, ctx.organizationId);

    const now = new Date();
    await db
      .update(memberships)
      .set({
        roleId: roleRow!.id,
        status: parsed.data.status,
        updatedAt: now,
      })
      .where(
        and(
          eq(memberships.id, memberRow!.id),
          eq(memberships.organizationId, ctx.organizationId)
        )
      );

    // Unlink any previous professional linked to this user in this organization
    await db
      .update(professionals)
      .set({ userId: null, updatedAt: now })
      .where(
        and(
          eq(professionals.organizationId, ctx.organizationId),
          eq(professionals.userId, memberRow!.userId)
        )
      );

    if (parsed.data.professionalId) {
      await db
        .update(professionals)
        .set({ userId: memberRow!.userId, updatedAt: now })
        .where(
          and(
            eq(professionals.id, parsed.data.professionalId),
            eq(professionals.organizationId, ctx.organizationId)
          )
        );
    }

    await logAudit({
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      action: "member.access_updated",
      resourceType: "membership",
      resourceId: memberRow!.id,
      metadata: { roleSlug: roleRow!.slug, status: parsed.data.status },
    });

    revalidatePath("/app/configuracoes");
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error
          ? error.message
          : "Erro ao atualizar acesso do usuário.",
    };
  }
}

