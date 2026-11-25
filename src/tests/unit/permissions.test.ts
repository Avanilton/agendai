import { describe, it, expect } from "vitest";
import { DEFAULT_ROLE_TEMPLATES } from "@/lib/permissions/catalog";
import {
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  resolveEffectivePermissions,
} from "@/lib/permissions/evaluator";

describe("RBAC Permission Evaluator & Sensitive Data Protection", () => {
  it("prevents receptionist and financial roles from accessing medical records", () => {
    const receptionist = DEFAULT_ROLE_TEMPLATES.find((r) => r.slug === "receptionist");
    const financial = DEFAULT_ROLE_TEMPLATES.find((r) => r.slug === "financial");
    const professional = DEFAULT_ROLE_TEMPLATES.find((r) => r.slug === "professional");

    expect(receptionist).toBeDefined();
    expect(financial).toBeDefined();
    expect(professional).toBeDefined();

    const recPerms = resolveEffectivePermissions(receptionist!.permissions);
    const finPerms = resolveEffectivePermissions(financial!.permissions);
    const proPerms = resolveEffectivePermissions(professional!.permissions);

    expect(hasPermission(recPerms, "medical_records:read")).toBe(false);
    expect(hasPermission(finPerms, "medical_records:read")).toBe(false);
    expect(hasPermission(proPerms, "medical_records:read")).toBe(true);
  });

  it("applies individual custom permission grants and revokes correctly", () => {
    const effective = resolveEffectivePermissions(
      ["dashboard:read", "clients:read", "clients:write"],
      {
        grant: ["reports:read"],
        revoke: ["clients:write"],
      }
    );

    expect(hasPermission(effective, "reports:read")).toBe(true);
    expect(hasPermission(effective, "clients:write")).toBe(false);
    expect(hasAllPermissions(effective, ["dashboard:read", "reports:read"])).toBe(true);
    expect(hasAnyPermission(effective, ["financial:read", "clients:read"])).toBe(true);
  });
});

