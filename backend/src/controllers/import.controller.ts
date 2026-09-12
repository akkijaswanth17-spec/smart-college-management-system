import { Request, Response } from "express";
import fs from "fs";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/apiError";
import { prisma } from "../config/prisma";
import { parseCsv, importStudents, importFaculty, importTimetable } from "../services/import.service";
import { recordAudit } from "../services/audit.service";

async function runImport(
  req: Request,
  res: Response,
  type: "STUDENTS" | "FACULTY" | "TIMETABLE",
  importer: (rows: Record<string, string>[], userId: string) => Promise<{
    totalRows: number;
    successRows: number;
    failedRows: number;
    errors: { row: number; message: string }[];
  }>
) {
  if (!req.file) throw ApiError.badRequest("A CSV file is required");

  const buffer = fs.readFileSync(req.file.path);
  const rows = parseCsv(buffer);

  if (rows.length === 0) throw ApiError.badRequest("The uploaded file has no data rows");
  if (rows.length > 5000) throw ApiError.badRequest("Maximum 5000 rows per import");

  const summary = await importer(rows, req.user!.userId);

  const batch = await prisma.importBatch.create({
    data: {
      type,
      fileName: req.file.originalname,
      status: summary.failedRows === 0 ? "COMPLETED" : summary.successRows > 0 ? "COMPLETED_WITH_ERRORS" : "FAILED",
      totalRows: summary.totalRows,
      successRows: summary.successRows,
      failedRows: summary.failedRows,
      errors: summary.errors.length ? JSON.parse(JSON.stringify(summary.errors)) : undefined,
      importedById: req.user!.userId,
    },
  });

  await recordAudit({
    userId: req.user!.userId,
    action: type === "STUDENTS" ? "STUDENT_IMPORTED" : type === "FACULTY" ? "FACULTY_IMPORTED" : "TIMETABLE_IMPORTED",
    targetType: "ImportBatch",
    targetId: batch.id,
    metadata: { successRows: summary.successRows, failedRows: summary.failedRows },
  });

  res.status(201).json({ success: true, data: { batchId: batch.id, ...summary } });
}

export const importStudentsCsv = asyncHandler((req: Request, res: Response) =>
  runImport(req, res, "STUDENTS", importStudents)
);

export const importFacultyCsv = asyncHandler((req: Request, res: Response) =>
  runImport(req, res, "FACULTY", importFaculty)
);

export const importTimetableCsv = asyncHandler((req: Request, res: Response) =>
  runImport(req, res, "TIMETABLE", importTimetable)
);

export const listImportBatches = asyncHandler(async (_req: Request, res: Response) => {
  const batches = await prisma.importBatch.findMany({ orderBy: { createdAt: "desc" }, take: 20 });
  res.json({ success: true, data: batches });
});
