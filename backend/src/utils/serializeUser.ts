/**
 * Strips passwordHash (and other sensitive fields) before a user-shaped
 * object is ever sent in an API response. Every controller that returns
 * a User (or a User relation) must pass through this.
 */
export function serializeUser<T extends { passwordHash?: unknown }>(user: T): Omit<T, "passwordHash"> {
  const { passwordHash, ...safe } = user;
  return safe;
}
