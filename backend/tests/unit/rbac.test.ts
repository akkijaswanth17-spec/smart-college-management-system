import { describe, it, expect, vi } from "vitest";
import { Request, Response } from "express";
import { requireRole } from "../../src/middleware/rbac.middleware";
import { ApiError } from "../../src/utils/apiError";

function mockReq(role?: "STUDENT" | "FACULTY" | "ADMIN"): Request {
  return { user: role ? { userId: "u1", role } : undefined } as unknown as Request;
}

describe("requireRole middleware", () => {
  it("calls next() with no error when the user has an allowed role", () => {
    const next = vi.fn();
    requireRole("ADMIN")(mockReq("ADMIN"), {} as Response, next);
    expect(next).toHaveBeenCalledWith();
  });

  it("rejects with 403 when the user's role is not allowed", () => {
    const next = vi.fn();
    requireRole("ADMIN")(mockReq("STUDENT"), {} as Response, next);
    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0] as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.statusCode).toBe(403);
  });

  it("rejects with 401 when there is no authenticated user at all", () => {
    const next = vi.fn();
    requireRole("ADMIN")(mockReq(undefined), {} as Response, next);
    const err = next.mock.calls[0][0] as ApiError;
    expect(err.statusCode).toBe(401);
  });

  it("a faculty account is rejected from admin-only routes (never self-promotes)", () => {
    const next = vi.fn();
    requireRole("ADMIN")(mockReq("FACULTY"), {} as Response, next);
    const err = next.mock.calls[0][0] as ApiError;
    expect(err.statusCode).toBe(403);
  });
});
