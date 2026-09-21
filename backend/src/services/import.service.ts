import { parse } from "csv-parse/sync";
import * as XLSX from "xlsx";
import { DayOfWeek } from "@prisma/client";
import { prisma } from "../config/prisma";
import { hashPassword, generateTempPassword } from "../utils/password";
import { assertNoTimetableConflict } from "./timetable.service";

export interface RowError {
  row: number;
  message: string;
}

export interface ImportSummary {
  totalRows: number;
  successRows: number;
  failedRows: number;
  errors: RowError[];
  /** Marks sheet import only — which subject columns were actually found and used. */
  matchedSubjects?: string[];
  /** Marks sheet import only — file columns that didn't match any subject for this class, ignored. */
  skippedColumns?: string[];
}

export function parseCsv(buffer: Buffer): Record<string, string>[] {
  return parse(buffer, {
    columns: (header: string[]) => header.map((h) => h.trim().toLowerCase().replace(/\s+/g, "_")),
    skip_empty_lines: true,
    trim: true,
  });
}

function parseXlsx(buffer: Buffer): Record<string, string>[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });
  return rows.map((row) => {
    const normalized: Record<string, string> = {};
    Object.entries(row).forEach(([key, value]) => {
      normalized[key.trim().toLowerCase().replace(/\s+/g, "_")] = String(value ?? "").trim();
    });
    return normalized;
  });
}

/** Accepts either a .csv or a .xlsx/.xls import file, based on the original filename. */
export function parseImportFile(buffer: Buffer, filename: string): Record<string, string>[] {
  return /\.(xlsx|xls)$/i.test(filename) ? parseXlsx(buffer) : parseCsv(buffer);
}

const DAY_ALIASES: Record<string, DayOfWeek> = {
  monday: "MONDAY",
  tuesday: "TUESDAY",
  wednesday: "WEDNESDAY",
  thursday: "THURSDAY",
  friday: "FRIDAY",
  saturday: "SATURDAY",
  sunday: "SUNDAY",
};

async function findOrCreateDepartment(nameOrCode: string) {
  const value = nameOrCode.trim();
  let dept = await prisma.department.findFirst({ where: { OR: [{ name: value }, { code: value }] } });
  if (!dept) {
    dept = await prisma.department.create({
      data: { name: value, code: value.toUpperCase().replace(/\s+/g, "_").slice(0, 20) },
    });
  }
  return dept;
}

export interface StudentImportDefaults {
  /** Used for every row that doesn't specify its own department/year/section — the
   * common case for a plain "roll_no, name" class roster. */
  departmentId?: string;
  year?: number;
  section?: string;
}

/** Students already log in with just their Roll Number (see auth.service.ts), so a
 * placeholder login email — never actually used by the student — is fine here. */
function placeholderEmail(studentId: string): string {
  const local = studentId.toLowerCase().replace(/[^a-z0-9.-]/g, "") || "student";
  return `${local}@students.local`;
}

export async function importStudents(
  rows: Record<string, string>[],
  importedById: string,
  defaults: StudentImportDefaults = {}
): Promise<ImportSummary> {
  const errors: RowError[] = [];
  let successRows = 0;

  const defaultDept = defaults.departmentId ? await prisma.department.findUnique({ where: { id: defaults.departmentId } }) : null;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const lineNo = i + 2; // account for header row
    try {
      const name = row.name?.trim();
      // "roll_no" is the current column name — "student_id" still accepted for older sheets.
      const studentId = row.roll_no?.trim() || row.student_id?.trim();

      if (!name || !studentId) {
        throw new Error("Missing required field(s): roll_no, name");
      }

      const department = row.department?.trim();
      const year = row.year?.trim() ? parseInt(row.year, 10) : defaults.year;
      const section = row.section?.trim() || defaults.section;

      if (!department && !defaultDept) {
        throw new Error("No department column in the sheet and none selected before importing");
      }
      if (year === undefined || Number.isNaN(year)) {
        throw new Error("No year column in the sheet and none selected before importing");
      }
      if (!section) {
        throw new Error("No section column in the sheet and none selected before importing");
      }

      const email = row.email?.trim().toLowerCase() || placeholderEmail(studentId);
      const phone = row.phone?.trim() || "";

      const [existingEmail, existingStudentId] = await Promise.all([
        prisma.user.findUnique({ where: { email } }),
        prisma.student.findUnique({ where: { studentId } }),
      ]);
      if (existingEmail) throw new Error(`Email ${email} already registered`);
      if (existingStudentId) throw new Error(`Student ID ${studentId} already registered`);

      const dept = department ? await findOrCreateDepartment(department) : defaultDept!;
      // Defaults to the student's own Roll Number when the sheet doesn't specify one.
      const tempPassword = row.password?.trim() || studentId;
      const passwordHash = await hashPassword(tempPassword);

      await prisma.user.create({
        data: {
          email,
          passwordHash,
          role: "STUDENT",
          mustChangePassword: true,
          student: {
            create: { fullName: name, studentId, phone, departmentId: dept.id, year, section },
          },
        },
      });

      successRows += 1;
    } catch (err) {
      errors.push({ row: lineNo, message: err instanceof Error ? err.message : "Unknown error" });
    }
  }

  return { totalRows: rows.length, successRows, failedRows: errors.length, errors };
}

export async function importFaculty(rows: Record<string, string>[], importedById: string): Promise<ImportSummary> {
  const errors: RowError[] = [];
  let successRows = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const lineNo = i + 2;
    try {
      const name = row.name?.trim();
      const facultyId = row.faculty_id?.trim();
      const email = row.email?.trim().toLowerCase();
      const phone = row.phone?.trim();
      const department = row.department?.trim();
      const designation = row.designation?.trim() || "Faculty";

      if (!name || !facultyId || !email || !phone || !department) {
        throw new Error("Missing required field(s): name, faculty_id, email, phone, department");
      }

      const [existingEmail, existingFacultyId] = await Promise.all([
        prisma.user.findUnique({ where: { email } }),
        prisma.faculty.findUnique({ where: { facultyId } }),
      ]);
      if (existingEmail) throw new Error(`Email ${email} already registered`);
      if (existingFacultyId) throw new Error(`Faculty ID ${facultyId} already registered`);

      const dept = await findOrCreateDepartment(department);
      const tempPassword = row.password?.trim() || generateTempPassword();
      const passwordHash = await hashPassword(tempPassword);

      await prisma.user.create({
        data: {
          email,
          passwordHash,
          role: "FACULTY",
          mustChangePassword: true,
          faculty: {
            create: { fullName: name, facultyId, phone, departmentId: dept.id, designation },
          },
        },
      });

      successRows += 1;
    } catch (err) {
      errors.push({ row: lineNo, message: err instanceof Error ? err.message : "Unknown error" });
    }
  }

  return { totalRows: rows.length, successRows, failedRows: errors.length, errors };
}

export async function importTimetable(rows: Record<string, string>[], importedById: string): Promise<ImportSummary> {
  const errors: RowError[] = [];
  let successRows = 0;
  const academicYearDefault = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const lineNo = i + 2;
    try {
      const facultyCode = row.faculty_id?.trim();
      const subjectName = row.subject?.trim();
      const departmentName = row.department?.trim();
      const year = parseInt(row.year ?? "", 10);
      const section = row.section?.trim();
      const dayRaw = row.day?.trim().toLowerCase();
      const startTime = row.start_time?.trim();
      const endTime = row.end_time?.trim();
      const roomNumber = row.room?.trim();
      const blockName = row.block?.trim();
      const academicYear = row.academic_year?.trim() || academicYearDefault;

      if (
        !facultyCode ||
        !subjectName ||
        !departmentName ||
        !section ||
        !dayRaw ||
        !startTime ||
        !endTime ||
        !roomNumber ||
        !blockName ||
        Number.isNaN(year)
      ) {
        throw new Error(
          "Missing required field(s): faculty_id, subject, department, year, section, day, start_time, end_time, room, block"
        );
      }

      const day = DAY_ALIASES[dayRaw];
      if (!day) throw new Error(`Invalid day: ${row.day}`);

      const faculty = await prisma.faculty.findUnique({ where: { facultyId: facultyCode } });
      if (!faculty) throw new Error(`Faculty with ID ${facultyCode} not found`);

      const dept = await findOrCreateDepartment(departmentName);

      let subject = await prisma.subject.findFirst({ where: { name: subjectName, departmentId: dept.id } });
      if (!subject) {
        subject = await prisma.subject.create({
          data: {
            name: subjectName,
            code: `${dept.code}-${subjectName.toUpperCase().replace(/\s+/g, "").slice(0, 10)}`,
            departmentId: dept.id,
          },
        });
      }

      let block = await prisma.block.findFirst({ where: { name: blockName } });
      if (!block) block = await prisma.block.create({ data: { name: blockName } });

      let room = await prisma.room.findFirst({ where: { number: roomNumber, blockId: block.id } });
      if (!room) room = await prisma.room.create({ data: { number: roomNumber, blockId: block.id } });

      await assertNoTimetableConflict({
        facultyId: faculty.id,
        roomId: room.id,
        day,
        startTime,
        endTime,
        academicYear,
      });

      await prisma.timetableEntry.create({
        data: {
          facultyId: faculty.id,
          subjectId: subject.id,
          departmentId: dept.id,
          year,
          section,
          day,
          startTime,
          endTime,
          roomId: room.id,
          blockId: block.id,
          academicYear,
        },
      });

      successRows += 1;
    } catch (err) {
      errors.push({ row: lineNo, message: err instanceof Error ? err.message : "Unknown error" });
    }
  }

  return { totalRows: rows.length, successRows, failedRows: errors.length, errors };
}
