import { NextFunction, Request, Response } from "express";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/apiError";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Set by resolveBranchScope — the BRANCH user's own department id. */
      branchDepartmentId?: string;
    }
  }
}

/**
 * For a BRANCH-role request, loads that user's own department and attaches
 * it as `req.branchDepartmentId`. Every controller that BRANCH is allowed to
 * touch (students, faculty, timetable, marks) must use this to force its
 * `departmentId` — never trust a client-supplied departmentId for BRANCH,
 * since that's exactly the cross-branch access this role must not have.
 * A no-op for every other role.
 */
export async function resolveBranchScope(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== "BRANCH") return next();

  const branchAdmin = await prisma.branchAdmin.findUnique({ where: { userId: req.user.userId } });
  if (!branchAdmin) return next(ApiError.forbidden("Branch account is not set up correctly"));

  req.branchDepartmentId = branchAdmin.departmentId;
  next();
}

/**
 * Throws 403 if this request is a BRANCH user trying to touch a record
 * outside their own department. A no-op for every other role. Call this
 * after loading the record you're about to return/modify — never trust a
 * departmentId that came from the request body/query for a BRANCH caller.
 */
export function assertOwnBranch(req: Request, recordDepartmentId: string) {
  if (req.user?.role === "BRANCH" && req.branchDepartmentId !== recordDepartmentId) {
    throw ApiError.forbidden("You can only access records in your own department");
  }
}

/** For a BRANCH caller, always use their own department — ignore any client-supplied one. */
export function scopedDepartmentId(req: Request, requested?: string): string | undefined {
  if (req.user?.role === "BRANCH") return req.branchDepartmentId;
  return requested;
}
