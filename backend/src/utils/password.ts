// Native bcrypt (not bcryptjs): same hash format/cost factor, fully
// compatible with every password already hashed by bcryptjs, but runs the
// actual hashing in a C++ addon off the main thread instead of blocking it
// with pure-JS work — on a CPU-constrained host this is the difference
// between a login taking ~4s and ~100-300ms, and it stops concurrent logins
// from queuing behind each other on the single JS thread.
import bcrypt from "bcrypt";

const SALT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Generates a random temporary password for imported accounts. Never logged or returned via API. */
export function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";
  let out = "";
  for (let i = 0; i < 12; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}
