import fs from "fs";
import path from "path";
import crypto from "crypto";
import multer, { FileFilterCallback } from "multer";
import { Request } from "express";
import { env } from "../config/env";
import { ApiError } from "../utils/apiError";

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_DOC_TYPES = new Set([...ALLOWED_IMAGE_TYPES, "application/pdf"]);
const ALLOWED_IMPORT_TYPES = new Set([
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function safeFilename(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase().replace(/[^a-z0-9.]/g, "");
  const random = crypto.randomBytes(16).toString("hex");
  return `${Date.now()}-${random}${ext}`;
}

function makeStorage(subdir: string) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      const dest = path.join(env.uploadDir, subdir);
      ensureDir(dest);
      cb(null, dest);
    },
    filename: (_req, file, cb) => {
      cb(null, safeFilename(file.originalname));
    },
  });
}

function fileFilterFor(allowed: Set<string>) {
  return (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const dangerousExt = [".exe", ".bat", ".cmd", ".sh", ".js", ".php", ".dll", ".msi"];
    if (dangerousExt.includes(ext)) {
      return cb(new Error("File type not allowed"));
    }
    if (!allowed.has(file.mimetype)) {
      return cb(new Error("File type not allowed"));
    }
    cb(null, true);
  };
}

const limits = { fileSize: env.maxUploadMb * 1024 * 1024 };

export const uploadNoticeAttachment = multer({
  storage: makeStorage("notices"),
  fileFilter: fileFilterFor(ALLOWED_DOC_TYPES),
  limits,
}).single("attachment");

export const uploadLostFoundImage = multer({
  storage: makeStorage("lostfound"),
  fileFilter: fileFilterFor(ALLOWED_IMAGE_TYPES),
  limits,
}).single("image");

export const uploadAcademicAttachment = multer({
  storage: makeStorage("academic"),
  fileFilter: fileFilterFor(ALLOWED_DOC_TYPES),
  limits,
}).single("attachment");

export const uploadTimetableImage = multer({
  storage: makeStorage("timetable"),
  fileFilter: fileFilterFor(ALLOWED_IMAGE_TYPES),
  limits,
}).single("image");

export const uploadBrandingImage = multer({
  storage: makeStorage("branding"),
  fileFilter: fileFilterFor(ALLOWED_IMAGE_TYPES),
  limits,
}).single("image");

// Render's free-tier filesystem is wiped on every redeploy, so avatars are kept
// in memory here and stored as a data URI in the database (see auth.controller)
// instead of on disk like the other upload types below.
export const uploadAvatarImage = multer({
  storage: multer.memoryStorage(),
  fileFilter: fileFilterFor(ALLOWED_IMAGE_TYPES),
  limits: { fileSize: 2 * 1024 * 1024 },
}).single("avatar");

export const uploadImportFile = multer({
  storage: makeStorage("imports"),
  fileFilter: fileFilterFor(ALLOWED_IMPORT_TYPES),
  limits: { fileSize: 10 * 1024 * 1024 },
}).single("file");

export function multerErrorToApiError(err: unknown): ApiError {
  const message = err instanceof Error ? err.message : "File upload failed";
  return ApiError.badRequest(message);
}
