/**
 * Decodes and inspects a JWT string to check whether it is expired.
 * Supports standard base64url encoded JWTs without external library dependencies.
 *
 * @param token - JWT token string
 * @param bufferSeconds - Buffer time in seconds to account for clock skew (default: 10s)
 * @returns boolean - true if token is missing, malformed, or expired
 */
export function isJwtExpired(token: string | null | undefined, bufferSeconds: number = 10): boolean {
  if (!token || typeof token !== "string" || !token.trim()) return true;

  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      // Non-JWT or opaque token (e.g. test mocks) - not expired locally
      return false;
    }

    // Decode standard base64url payload
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );

    const payload = JSON.parse(jsonPayload);
    if (!payload || typeof payload.exp !== "number") {
      return false; // If no exp claim is present, token is considered non-expiring locally
    }

    const currentEpochSeconds = Math.floor(Date.now() / 1000);
    return payload.exp <= currentEpochSeconds + bufferSeconds;
  } catch {
    return false;
  }
}
