import { Request } from "express";

// Each role gets its own session cookie (token_admin, token_student, ...) so an
// admin and a student can stay signed in side by side in the same browser. The
// frontend says which of them a request belongs to via the X-Session-Role
// header (derived from the tab's /admin, /student... section).
const ROLES = ["admin", "faculty", "student", "branch"] as const;
export type SessionRole = (typeof ROLES)[number];

export const LEGACY_COOKIE = "token";

export function cookieNameFor(role: string): string {
  return `token_${role.toLowerCase()}`;
}

export function asSessionRole(value: unknown): SessionRole | undefined {
  const raw = String(value ?? "").toLowerCase();
  return (ROLES as readonly string[]).includes(raw) ? (raw as SessionRole) : undefined;
}

export function requestedSessionRole(req: Request): SessionRole | undefined {
  return asSessionRole(req.headers["x-session-role"]);
}

/** Picks the session token for this request: the requested role's cookie, else the legacy shared one. */
export function sessionTokenFrom(req: Request): string | undefined {
  const role = requestedSessionRole(req);
  if (role && req.cookies?.[cookieNameFor(role)]) return req.cookies[cookieNameFor(role)];
  if (req.cookies?.[LEGACY_COOKIE]) return req.cookies[LEGACY_COOKIE];
  if (role) return undefined;
  // No role given (e.g. an old cached frontend) — fall back to the only role cookie present, if exactly one.
  const present = ROLES.map((r) => req.cookies?.[cookieNameFor(r)]).filter(Boolean);
  return present.length === 1 ? present[0] : undefined;
}
