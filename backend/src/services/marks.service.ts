import * as XLSX from "xlsx";
import { prisma } from "../config/prisma";
import { RowError, ImportSummary } from "./import.service";
import { ApiError } from "../utils/apiError";

/**
 * Reads an uploaded .xlsx/.xls/.csv buffer into normalized, lowercase-snake_case-keyed
 * rows. Real college sheets often have a title banner ("III Year CME A MID-I Marks
 * Report") in row 1, sometimes a blank spacer row, and only THEN the actual column
 * headers — treating row 1 as the header row in that case would misread the title as
 * a single giant column name and everything else as "__empty". So the sheet is read
 * as a raw grid first, and whichever row actually looks like a header row (contains a
 * cell like "S.No", "PIN Number", "Roll Number" or "Name") is used instead.
 */
export function parseSpreadsheet(buffer: Buffer): Record<string, string>[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  const sheet = workbook.Sheets[sheetName];
  const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: false });

  const looksLikeHeaderRow = (row: unknown[]) =>
    row.some((cell) => /^(s\.?\s?no|pin|roll|student|name)/i.test(String(cell).trim()));
  const headerRowIndex = grid.findIndex(looksLikeHeaderRow);
  const startRow = headerRowIndex === -1 ? 0 : headerRowIndex;

  const headers = (grid[startRow] ?? []).map((h) => String(h).trim());

  return grid
    .slice(startRow + 1)
    .filter((row) => row.some((cell) => String(cell).trim() !== ""))
    .map((row) => {
      const normalized: Record<string, string> = {};
      headers.forEach((key, i) => {
        if (!key) return;
        const normalizedKey = key.toLowerCase().replace(/\s+/g, "_");
        normalized[normalizedKey] = String(row[i] ?? "").trim();
      });
      return normalized;
    });
}

function compactKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Looks a value up by a list of acceptable header spellings, ignoring case,
 * spaces, underscores and hyphens — so "Roll Number", "roll_no" and
 * "RollNumber" all resolve the same way. Admin-typed Excel headers vary a lot.
 */
function pickField(row: Record<string, string>, aliases: string[]): string | undefined {
  const compactAliases = new Set(aliases.map(compactKey));
  for (const [key, value] of Object.entries(row)) {
    if (compactAliases.has(compactKey(key))) return value;
  }
  return undefined;
}

function parseScore(raw: string | undefined): number | null | undefined {
  if (raw === undefined) return undefined;
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const num = Number(trimmed);
  if (Number.isNaN(num) || num < 0) throw new Error(`Invalid mark value "${raw}"`);
  return num;
}

// Short column headers colleges actually use on a real marks sheet — mirrors the
// same abbreviations shown in the manual entry grid (frontend SUBJECT_ABBREVIATIONS)
// so an admin's real Excel file matches without renaming anything.
const SUBJECT_ABBREVIATIONS: Record<string, string> = {
  "Android Programming": "AP",
  "Big Data & Cloud Computing": "BDCC",
  "Industrial Management and Entrepreneurship": "IME",
  "Internet Of Things": "IOT",
  "Python Programming": "PP",
};

const NON_SUBJECT_HEADERS = new Set(
  [
    "s_no",
    "sno",
    "pin_number",
    "pin",
    "roll_number",
    "roll_no",
    "student_id",
    "name_of_the_student",
    "name",
    "total",
    "marks_percentage",
    "percentage",
  ].map(compactKey)
);

function stripHeaderNoise(header: string): string {
  // "AP (40)" / "ap_(40)" -> "AP" — drop any parenthetical suffix, then keep letters/digits only.
  return header.replace(/\(.*?\)/g, "").replace(/[^a-z0-9]/gi, "").toUpperCase();
}

/** Matches a spreadsheet column header to one of this class's subjects, by code, full name, or abbreviation. */
function matchSubjectColumn(
  header: string,
  subjects: { id: string; name: string; code: string }[]
): string | null {
  const normalized = stripHeaderNoise(header);
  if (!normalized) return null;
  for (const s of subjects) {
    if (stripHeaderNoise(s.code) === normalized) return s.id;
    if (stripHeaderNoise(s.name) === normalized) return s.id;
    const abbr = SUBJECT_ABBREVIATIONS[s.name];
    if (abbr && stripHeaderNoise(abbr) === normalized) return s.id;
  }
  return null;
}

export async function importMarks(rows: Record<string, string>[], importedById: string): Promise<ImportSummary> {
  const errors: RowError[] = [];
  let successRows = 0;
  const academicYearDefault = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const lineNo = i + 2; // account for header row

    try {
      const rollNumber = pickField(row, ["roll_number", "roll_no", "student_id"])?.trim();
      const subjectIdentifier = pickField(row, ["subject", "subject_name", "subject_code"])?.trim();
      const academicYear = pickField(row, ["academic_year", "ay"])?.trim() || academicYearDefault;

      if (!rollNumber || !subjectIdentifier) {
        throw new Error("Missing required field(s): roll_number, subject");
      }

      const student = await prisma.student.findUnique({ where: { studentId: rollNumber } });
      if (!student) throw new Error(`No student found with roll number ${rollNumber}`);

      const subject = await prisma.subject.findFirst({
        where: { OR: [{ code: subjectIdentifier }, { name: subjectIdentifier }] },
      });
      if (!subject) throw new Error(`Subject "${subjectIdentifier}" not found`);

      const mid1 = parseScore(pickField(row, ["mid1", "mid_term1"]));
      const mid2 = parseScore(pickField(row, ["mid2", "mid_term2"]));
      const semester = parseScore(pickField(row, ["sem", "semester", "sem_marks", "end_sem"]));

      const scores: Record<string, number | null> = {};
      if (mid1 !== undefined) scores.mid1 = mid1;
      if (mid2 !== undefined) scores.mid2 = mid2;
      if (semester !== undefined) scores.semester = semester;

      await prisma.mark.upsert({
        where: {
          studentId_subjectId_academicYear: { studentId: student.id, subjectId: subject.id, academicYear },
        },
        create: { studentId: student.id, subjectId: subject.id, academicYear, importedById, ...scores },
        update: { importedById, ...scores },
      });

      successRows += 1;
    } catch (err) {
      errors.push({ row: lineNo, message: err instanceof Error ? err.message : "Unknown error" });
    }
  }

  return { totalRows: rows.length, successRows, failedRows: errors.length, errors };
}

export interface ImportMarksWideParams {
  departmentId: string;
  year: number;
  section: string;
  examType: "mid1" | "mid2" | "semester";
  academicYear: string;
}

/**
 * Imports a real class marks sheet as-is: one row per student (PIN Number /
 * roll number + name), one column per subject (matched by code, full name, or
 * the same short abbreviation shown in the manual entry grid — "AP", "BDCC",
 * etc). Every subject column in the file is applied to the single exam type
 * chosen for this import (the sheet itself doesn't carry that per column).
 */
export async function importMarksWide(
  rows: Record<string, string>[],
  params: ImportMarksWideParams,
  importedById: string
): Promise<ImportSummary> {
  const errors: RowError[] = [];
  let successRows = 0;
  const { departmentId, year, section, examType, academicYear } = params;

  const [students, timetableSubjects] = await Promise.all([
    prisma.student.findMany({
      where: { departmentId, year, section },
      select: { id: true, studentId: true },
    }),
    prisma.timetableEntry.findMany({
      where: { departmentId, year, section, isActive: true },
      distinct: ["subjectId"],
      select: { subject: { select: { id: true, name: true, code: true } } },
    }),
  ]);

  let subjects = timetableSubjects.map((t) => t.subject);
  if (subjects.length === 0) {
    subjects = await prisma.subject.findMany({ where: { departmentId }, select: { id: true, name: true, code: true } });
  }
  if (subjects.length === 0) throw ApiError.badRequest("This department has no subjects yet — add some under Timetable first");

  const studentByRoll = new Map(students.map((s) => [s.studentId, s.id]));

  // Resolve each file column to a subject exactly once, up front, so a header
  // that doesn't match anything is reported clearly instead of silently ignored.
  // A subject with no matching column in the file (e.g. this exam didn't cover
  // a lab subject) is simply left out — only the columns that ARE present get
  // imported, nothing is required to be complete.
  const headerKeys = rows.length > 0 ? Object.keys(rows[0]) : [];
  const columnSubjectId = new Map<string, string>();
  const skippedColumns: string[] = [];
  for (const header of headerKeys) {
    if (NON_SUBJECT_HEADERS.has(compactKey(header))) continue;
    const subjectId = matchSubjectColumn(header, subjects);
    if (subjectId) columnSubjectId.set(header, subjectId);
    else skippedColumns.push(header);
  }
  if (columnSubjectId.size === 0) {
    throw ApiError.badRequest(
      `None of the file's columns matched a subject for this class — found columns: ${headerKeys.join(", ")}. Expected one column per subject (e.g. AP, BDCC, IME) matching this class's subjects: ${subjects.map((s) => s.name).join(", ")}`
    );
  }
  const matchedSubjects = subjects
    .filter((s) => Array.from(columnSubjectId.values()).includes(s.id))
    .map((s) => s.name);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const lineNo = i + 2;

    try {
      const rollNumber = pickField(row, ["pin_number", "roll_number", "roll_no", "student_id", "pin"])?.trim();
      if (!rollNumber) throw new Error("Missing PIN Number / roll number");

      const studentId = studentByRoll.get(rollNumber);
      if (!studentId) throw new Error(`No student found with roll number ${rollNumber} in this class`);

      for (const [header, subjectId] of columnSubjectId) {
        const raw = row[header];
        if (raw === undefined || raw.trim() === "") continue;
        // "AB" (absent) and similar non-numeric markers are recorded as no
        // score rather than failing the whole student's row over one subject.
        const value = /^-?\d+(\.\d+)?$/.test(raw.trim()) ? Number(raw.trim()) : null;

        await prisma.mark.upsert({
          where: { studentId_subjectId_academicYear: { studentId, subjectId, academicYear } },
          create: { studentId, subjectId, academicYear, importedById, [examType]: value },
          update: { importedById, [examType]: value },
        });
      }

      successRows += 1;
    } catch (err) {
      errors.push({ row: lineNo, message: err instanceof Error ? err.message : "Unknown error" });
    }
  }

  return { totalRows: rows.length, successRows, failedRows: errors.length, errors, matchedSubjects, skippedColumns };
}
