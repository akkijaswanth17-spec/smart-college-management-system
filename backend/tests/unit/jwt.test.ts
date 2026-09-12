import { describe, it, expect } from "vitest";
import { signToken, verifyToken } from "../../src/utils/jwt";

describe("jwt utils", () => {
  it("round-trips a payload through sign and verify", () => {
    const token = signToken({ userId: "user_123", role: "STUDENT" });
    const payload = verifyToken(token);
    expect(payload.userId).toBe("user_123");
    expect(payload.role).toBe("STUDENT");
  });

  it("throws when verifying a tampered token", () => {
    const token = signToken({ userId: "user_123", role: "STUDENT" });
    const tampered = token.slice(0, -2) + "xx";
    expect(() => verifyToken(tampered)).toThrow();
  });
});
