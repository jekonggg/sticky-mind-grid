import { describe, it, expect } from "vitest";
import { isJwtExpired } from "@/utils/authUtils";

describe("authUtils - isJwtExpired", () => {
  function createMockJwt(expSec: number): string {
    const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const payload = btoa(JSON.stringify({ sub: "user-123", exp: expSec }));
    const signature = "dummy-signature";
    return `${header}.${payload}.${signature}`;
  }

  it("returns true for null, undefined, or empty token", () => {
    expect(isJwtExpired(null)).toBe(true);
    expect(isJwtExpired(undefined)).toBe(true);
    expect(isJwtExpired("")).toBe(true);
    expect(isJwtExpired("   ")).toBe(true);
  });

  it("returns false for non-JWT strings without dots", () => {
    expect(isJwtExpired("opaque-token-string")).toBe(false);
  });

  it("returns true when token exp is in the past", () => {
    const pastEpochSec = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
    const expiredJwt = createMockJwt(pastEpochSec);
    expect(isJwtExpired(expiredJwt)).toBe(true);
  });

  it("returns true when token exp is within buffer window", () => {
    const nearEpochSec = Math.floor(Date.now() / 1000) + 5; // 5 seconds in future (buffer is 10s)
    const expiringJwt = createMockJwt(nearEpochSec);
    expect(isJwtExpired(expiringJwt, 10)).toBe(true);
  });

  it("returns false when token exp is well in the future", () => {
    const futureEpochSec = Math.floor(Date.now() / 1000) + 7200; // 2 hours in future
    const validJwt = createMockJwt(futureEpochSec);
    expect(isJwtExpired(validJwt)).toBe(false);
  });

  it("returns false if JWT payload does not contain an exp claim", () => {
    const header = btoa(JSON.stringify({ alg: "HS256" }));
    const payload = btoa(JSON.stringify({ sub: "user-123" })); // No exp
    const token = `${header}.${payload}.sig`;
    expect(isJwtExpired(token)).toBe(false);
  });
});
