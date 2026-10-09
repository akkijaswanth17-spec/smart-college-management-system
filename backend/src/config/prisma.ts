import { PrismaClient } from "@prisma/client";
import { env } from "./env";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

/**
 * Without an explicit connection_limit, Prisma sizes its pool from the host's
 * CPU count (num_cpus * 2 + 1) — on a single-shared-core Render instance
 * that's as low as 3. Every concurrent request needs its own connection for
 * the duration of its queries, so with only 3 slots, a burst of simultaneous
 * requests (e.g. many students submitting feedback at once) queues almost
 * entirely rather than running in parallel — 20 concurrent logins measured
 * ~50s each instead of near-instant. Neon's pooler endpoint (the "-pooler"
 * host) is PgBouncer in transaction mode, which safely multiplexes many more
 * logical connections like this onto far fewer real Postgres backends, so
 * raising this here is safe even against a small/free database plan.
 */
function withConnectionLimit(url: string): string {
  if (/[?&]connection_limit=/.test(url)) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}connection_limit=20&pool_timeout=20`;
}

export const prisma =
  global.__prisma ??
  new PrismaClient({
    log: env.isProduction ? ["error", "warn"] : ["error", "warn"],
    datasources: { db: { url: withConnectionLimit(env.databaseUrl) } },
  });

if (!env.isProduction) {
  global.__prisma = prisma;
}
