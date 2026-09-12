import * as XLSX from "xlsx";
import { prisma } from "../config/prisma";
import { RowError, ImportSummary } from "./import.service";

/** Reads an uploaded .xlsx/.xls/.csv buffer into normalized, lowercase-snake_case-keyed rows. */
export function parseSpreadsheet(buffer: Buffer): Record<string, string>[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });

  return rawRows.map((row) => {
    const normalized: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      const normalizedKey = key.trim().toLowerCase().replace(/\s+/g, "_");
      normalized[normalizedKey] = String(value ?? "").trim();
    }
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
