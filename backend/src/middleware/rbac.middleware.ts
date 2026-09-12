import { NextFunction, Request, Response } from "express";
import { Role } from "@prisma/client";
import { ApiError } from "../utils/apiError";

/**
 * Backend-enforced role gate. Frontend menu/route hiding is convenience
 * only — every sensitive endpoint must be wrapped in this too, since a
 * client can always call the API directly regardless of what the UI shows.
 */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(ApiError.unauthorized());
    }
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden("You don't have permission to access this resource"));
    }
    next();
  };
}
