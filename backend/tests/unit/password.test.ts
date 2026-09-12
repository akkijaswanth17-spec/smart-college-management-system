import { describe, it, expect } from "vitest";
import { hashPassword, comparePassword, generateTempPassword } from "../../src/utils/password";

describe("password utils", () => {
  it("hashes a password so the hash never equals the plaintext", async () => {
    const hash = await hashPassword("Sup3rSecret!");
    expect(hash).not.toBe("Sup3rSecret!");
    expect(hash.startsWith("$2")).toBe(true); // bcrypt hash format
  });

  it("verifies a correct password against its hash", async () => {
    const hash = await hashPassword("Sup3rSecret!");
    expect(await comparePassword("Sup3rSecret!", hash)).toBe(true);
  });

  it("rejects an incorrect password against a hash", async () => {
    const hash = await hashPassword("Sup3rSecret!");
    expect(await comparePassword("WrongPassword", hash)).toBe(false);
  });

  it("generates a temporary password of sufficient length and randomness", () => {
    const a = generateTempPassword();
    const b = generateTempPassword();
    expect(a.length).toBeGreaterThanOrEqual(12);
    expect(a).not.toBe(b);
  });
});
