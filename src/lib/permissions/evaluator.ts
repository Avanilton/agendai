import type { CustomPermissionOverrides } from "@/db/schema/rbac";

export function resolveEffectivePermissions(
  rolePermissionCodes: string[],
  overrides?: CustomPermissionOverrides | null
): Set<string> {
  const effective = new Set<string>(rolePermissionCodes);

  if (overrides?.grant) {
    for (const code of overrides.grant) {
      effective.add(code);
    }
  }

  if (overrides?.revoke) {
    for (const code of overrides.revoke) {
      effective.delete(code);
    }
  }

  return effective;
}

export function hasPermission(
  effectivePermissions: Set<string>,
  required: string
): boolean {
  return effectivePermissions.has(required);
}

export function hasAllPermissions(
  effectivePermissions: Set<string>,
  required: string[]
): boolean {
  return required.every((perm) => effectivePermissions.has(perm));
}

export function hasAnyPermission(
  effectivePermissions: Set<string>,
  required: string[]
): boolean {
  return required.some((perm) => effectivePermissions.has(perm));
}

