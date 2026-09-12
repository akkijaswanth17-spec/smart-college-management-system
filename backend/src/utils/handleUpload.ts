import { NextFunction, Request, RequestHandler, Response } from "express";
import { multerErrorToApiError } from "../middleware/upload.middleware";

/**
 * Wraps a multer single-file middleware so upload errors (bad type, too
 * large) flow through our normal error handler instead of crashing.
 */
export function handleUpload(multerMiddleware: RequestHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    multerMiddleware(req, res, (err: unknown) => {
      if (err) return next(multerErrorToApiError(err));
      next();
    });
  };
}
