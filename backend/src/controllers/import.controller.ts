import { Request, Response } from "express";
import fs from "fs";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/apiError";
import { prisma } from "../config/prisma";
import { parseImportFile, parseImportFileGrouped, importStudents, importFaculty, importTimetable } from "../services/import.service";
import { recordAudit } from "../services/audit.service";

async function runImport(
  req: Request,
  res: Response,
  type: "STUDENTS" | "FACULTY" | "TIMETABLE",
  rows: Record<string, string>[],
  fileName: string,
  importer: (rows: Record<string, string>[], userId: string) => Promise<{
    totalRows: number;
    successRows: number;
    failedRows: number;
    errors: { row: number; message: string }[];
  }>
) {
  if (rows.length === 0) throw ApiError.badRequest("The uploaded file has no data rows");
  if (rows.length > 5000) throw ApiError.badRequest("Maximum 5000 rows per import");

  const summary = await importer(rows, req.user!.userId);

  const batch = await prisma.importBatch.create({
    data: {
      type,
      fileName,
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

export const importStudentsCsv = asyncHandler((req: Request, res: Response) => {
  if (!req.file) throw ApiError.badRequest("A CSV or Excel file is required");
  const buffer = fs.readFileSync(req.file.path);

  // A sheet with just Roll No + Name is common — Admin picks the class it belongs
  // to once here, instead of repeating Department/Year/Section on every row.
  const { departmentId, year, section } = req.body as { departmentId?: string; year?: string; section?: string };

  let rows: Record<string, string>[];
  if (departmentId === "ALL") {
    // One sheet per branch — each row's department/section can be read off its
    // sheet's tab name (e.g. "III Year DCME II") as a fallback, see import.service.ts.
    const groups = parseImportFileGrouped(buffer, req.file.originalname);
    rows = groups.flatMap((g) => g.rows.map((r) => ({ ...r, _sheet_name: g.sheetName })));
  } else {
    rows = parseImportFile(buffer, req.file.originalname);
  }

  const defaults = {
    departmentId: departmentId && departmentId !== "ALL" ? departmentId : undefined,
    year: year ? Number(year) : undefined,
    section: section && section !== "ALL" ? section : undefined,
  };
  return runImport(req, res, "STUDENTS", rows, req.file.originalname, (r, userId) => importStudents(r, userId, defaults));
});

export const importFacultyCsv = asyncHandler((req: Request, res: Response) => {
  if (!req.file) throw ApiError.badRequest("A CSV or Excel file is required");
  const buffer = fs.readFileSync(req.file.path);
  return runImport(req, res, "FACULTY", parseImportFile(buffer, req.file.originalname), req.file.originalname, importFaculty);
});

export const importTimetableCsv = asyncHandler((req: Request, res: Response) => {
  if (!req.file) throw ApiError.badRequest("A CSV or Excel file is required");
  const buffer = fs.readFileSync(req.file.path);
  return runImport(req, res, "TIMETABLE", parseImportFile(buffer, req.file.originalname), req.file.originalname, importTimetable);
});

export const listImportBatches = asyncHandler(async (_req: Request, res: Response) => {
  const batches = await prisma.importBatch.findMany({ orderBy: { createdAt: "desc" }, take: 20 });
  res.json({ success: true, data: batches });
});
