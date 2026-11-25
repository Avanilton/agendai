import { describe, it, expect } from "vitest";
import {
  AuthorizationError,
  assertPermission,
  assertTenantOwnership,
} from "@/lib/tenant/context";

describe("Multi-Tenant Isolation & Authorization Guards", () => {
  const TENANT_A = "11111111-1111-4111-8111-111111111111";
  const TENANT_B = "22222222-2222-4222-8222-222222222222";

  it("allows access when resource belongs to active tenant", () => {
    expect(() => assertTenantOwnership(TENANT_A, TENANT_A)).not.toThrow();
  });

  it("blocks cross-tenant access with 404 (zero-leak policy)", () => {
    try {
      assertTenantOwnership(TENANT_B, TENANT_A);
      expect.fail("Should have thrown AuthorizationError");
    } catch (err) {
      expect(err).toBeInstanceOf(AuthorizationError);
      expect((err as AuthorizationError).statusCode).toBe(404);
    }
  });

  it("blocks access when resource organizationId is null or undefined", () => {
    expect(() => assertTenantOwnership(null, TENANT_A)).toThrow(AuthorizationError);
    expect(() => assertTenantOwnership(undefined, TENANT_A)).toThrow(AuthorizationError);
  });

  it("enforces server-side RBAC permissions strictly", () => {
    const receptionistCtx = {
      permissions: new Set(["dashboard:read", "appointments:read", "clients:read"]),
    };

    expect(() => assertPermission(receptionistCtx, "clients:read")).not.toThrow();
    expect(() => assertPermission(receptionistCtx, "medical_records:read")).toThrow(
      AuthorizationError
    );
    expect(() => assertPermission(receptionistCtx, "financial:read")).toThrow(
      AuthorizationError
    );
  });
});

