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

function normalizeHeaderKey(key: string): string {
  return key
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

// A real registrar's sheet rarely spells these exactly "roll_no" / "name" — this
// maps the common real-world spellings onto the canonical column names.
const HEADER_ALIASES: Record<string, string> = {
  regd_no: "roll_no",
  reg_no: "roll_no",
  regno: "roll_no",
  registration_no: "roll_no",
  registration_number: "roll_no",
  ht_no: "roll_no",
  htno: "roll_no",
  hall_ticket_no: "roll_no",
  hallticket_no: "roll_no",
  pin_no: "roll_no",
  pin: "roll_no",
  name_of_the_student: "name",
  name_of_student: "name",
  student_name: "name",
  candidate_name: "name",
};

function applyHeaderAlias(key: string): string {
  return HEADER_ALIASES[key] ?? key;
}

/** A real sheet often has a title/letterhead above the actual header row (college
 * name, class label, etc.) — this finds the first row that actually looks like one,
 * the same heuristic already used for marks sheet imports. */
function looksLikeHeaderRow(row: unknown[]): boolean {
  return row.some((cell) => /^(s\.?\s?no|pin|roll|regd|reg\.?\s?no|student|name)/i.test(String(cell ?? "").trim()));
}

interface HeaderColumn {
  index: number;
  key: string;
}

/** A sheet sometimes packs two side-by-side student lists into the same rows
 * (e.g. columns A-C and E-G, to fit more names per page) — this splits the header
 * row into one independent column group per block, wherever a header cell is blank. */
function buildHeaderGroups(headerRow: unknown[]): HeaderColumn[][] {
  const groups: HeaderColumn[][] = [];
  let current: HeaderColumn[] = [];
  headerRow.forEach((raw, index) => {
    const text = String(raw ?? "").trim();
    if (!text) {
      if (current.length) groups.push(current);
      current = [];
      return;
    }
    current.push({ index, key: applyHeaderAlias(normalizeHeaderKey(text)) });
  });
  if (current.length) groups.push(current);
  return groups;
}

function normalizeSheetRows(sheet: XLSX.WorkSheet): Record<string, string>[] {
  const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: false });
  const headerRowIndex = grid.findIndex(looksLikeHeaderRow);
  const startRow = headerRowIndex === -1 ? 0 : headerRowIndex;
  const groups = buildHeaderGroups(grid[startRow] ?? []);
  const dataRows = grid.slice(startRow + 1);

  const result: Record<string, string>[] = [];
  for (const group of groups) {
    for (const row of dataRows) {
      const normalized: Record<string, string> = {};
      let hasValue = false;
      for (const { index, key } of group) {
        if (!key) continue;
        const value = String(row[index] ?? "").trim();
        if (value) hasValue = true;
        normalized[key] = value;
      }
      if (hasValue) result.push(normalized);
    }
  }
  return result;
}

function parseXlsx(buffer: Buffer): Record<string, string>[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  return normalizeSheetRows(workbook.Sheets[sheetName]);
}

/** Accepts either a .csv or a .xlsx/.xls import file, based on the original filename. */
export function parseImportFile(buffer: Buffer, filename: string): Record<string, string>[] {
  return /\.(xlsx|xls)$/i.test(filename) ? parseXlsx(buffer) : parseCsv(buffer);
}

/** Every non-empty sheet in a workbook, kept separate by tab name — a .csv only ever has one "sheet". */
export function parseImportFileGrouped(buffer: Buffer, filename: string): { sheetName: string; rows: Record<string, string>[] }[] {
  if (!/\.(xlsx|xls)$/i.test(filename)) {
    return [{ sheetName: "", rows: parseCsv(buffer) }];
  }
  const workbook = XLSX.read(buffer, { type: "buffer" });
  return workbook.SheetNames.map((sheetName) => ({ sheetName, rows: normalizeSheetRows(workbook.Sheets[sheetName]) })).filter(
    (g) => g.rows.length > 0
  );
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

// The Roll Number itself encodes the branch (e.g. "24351-CM-001") — this is checked
// before anything else, since it's the one signal that's always present and reliable,
// unlike a sheet's tab name or an optional department column.
const ROLL_NO_BRANCH_CODES: Record<string, string> = {
  CM: "DCME",
  DCME: "DCME",
  EC: "ECE",
  DECE: "ECE",
  EE: "EEE",
  DEEE: "EEE",
  ME: "MECH",
  M: "MECH",
  DME: "MECH",
  CE: "CIVIL",
  C: "CIVIL",
  DCE: "CIVIL",
  AM: "AIML",
  AIM: "AIML",
  DAIML: "AIML",
};

function departmentCodeFromRollNo(rollNo: string): string | undefined {
  const letterRuns = rollNo.toUpperCase().match(/[A-Z]+/g) ?? [];
  for (const run of letterRuns) {
    if (ROLL_NO_BRANCH_CODES[run]) return ROLL_NO_BRANCH_CODES[run];
  }
  return undefined;
}

/** Matches a sheet tab's name (e.g. "V Sem ECE" or "V Sem DCME Section-II") against
 * either the short Roll No branch codes or an existing department's own code. */
function departmentFromSheetName(
  sheetName: string,
  deptByCode: Map<string, { id: string; code: string; name: string }>
): { id: string; code: string; name: string } | undefined {
  const byRollCode = deptByCode.get(departmentCodeFromRollNo(sheetName) ?? "");
  if (byRollCode) return byRollCode;

  const tokens = sheetName.toUpperCase().match(/[A-Z]+/g) ?? [];
  for (const token of tokens) {
    const match = deptByCode.get(token);
    if (match) return match;
  }
  return undefined;
}

// A section is sometimes written as a plain letter (A, B, C, D) and sometimes as a
// Roman numeral (I, II, III, IV) — both mean the same thing.
const ROMAN_TO_SECTION_LETTER: Record<string, string> = { I: "A", II: "B", III: "C", IV: "D", V: "E", VI: "F" };

function normalizeSectionValue(raw?: string): string | undefined {
  const value = raw?.trim().toUpperCase();
  if (!value) return undefined;
  return ROMAN_TO_SECTION_LETTER[value] ?? value;
}

const YEAR_OR_SEM_WORDS = new Set(["YEAR", "YR", "SEM", "SEMESTER"]);

/** Pulls a section letter out of a sheet tab name like "III Year DCME II", "V Sem
 * DCME Section-II", or "II DCME III SEM A" — a name can carry up to two Roman
 * numerals (year and semester), and only a trailing one that isn't either of
 * those is actually the section. Skips: the very first token if it's a Roman
 * numeral (always the leading year marker), and any Roman numeral immediately
 * followed by "Year"/"Sem"/etc. */
function sectionFromSheetName(sheetName: string): string | undefined {
  const tokens = sheetName.toUpperCase().match(/[A-Z]+/g) ?? [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const next = tokens[i + 1];
    const isLeadingYearRoman = i === 0 && !!ROMAN_TO_SECTION_LETTER[token];
    const isYearOrSemRoman = !!next && YEAR_OR_SEM_WORDS.has(next) && !!ROMAN_TO_SECTION_LETTER[token];
    if (isLeadingYearRoman || isYearOrSemRoman) continue;
    const normalized = normalizeSectionValue(token);
    if (normalized && /^[A-F]$/.test(normalized)) return normalized;
  }
  return undefined;
}

interface PreparedStudentRow {
  lineNo: number;
  name: string;
  studentId: string;
  email: string;
  phone: string;
  year: number;
  section: string;
  departmentId: string;
  password: string;
}

// A large sheet (100+ rows) doing 3-4 sequential DB round trips per row — one at a
// time, awaited — is slow enough to time out the request before it ever finishes.
// This resolves every row's fields first (cheap, no per-row DB calls beyond a
// department-text cache), batch-checks for existing emails/Roll Numbers in two
// queries total, then creates the accounts in small concurrent batches.
export async function importStudents(
  rows: Record<string, string>[],
  importedById: string,
  defaults: StudentImportDefaults = {}
): Promise<ImportSummary> {
  const errors: RowError[] = [];
  let successRows = 0;

  const [defaultDept, allDepts] = await Promise.all([
    defaults.departmentId ? prisma.department.findUnique({ where: { id: defaults.departmentId } }) : null,
    prisma.department.findMany(),
  ]);
  const deptByCode = new Map(allDepts.map((d) => [d.code.toUpperCase(), d]));
  const deptTextCache = new Map<string, Awaited<ReturnType<typeof findOrCreateDepartment>>>();

  const prepared: PreparedStudentRow[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const lineNo = i + 2; // account for header row
    try {
      const name = row.name?.trim();
      // "roll_no" is the current column name — "student_id" still accepted for older sheets.
      const studentId = (row.roll_no?.trim() || row.student_id?.trim())?.toUpperCase();

      if (!name || !studentId) {
        throw new Error("Missing required field(s): roll_no, name");
      }

      const rollNoBranchCode = departmentCodeFromRollNo(studentId);
      const rollNoDept = rollNoBranchCode ? deptByCode.get(rollNoBranchCode) : undefined;
      // Last-resort fallback for a multi-sheet workbook when a row's own Roll No
      // doesn't carry a recognizable branch code — try the sheet tab's name too.
      const sheetDept = row._sheet_name ? departmentFromSheetName(row._sheet_name, deptByCode) : undefined;
      const departmentText = row.department?.trim();
      const year = row.year?.trim() ? parseInt(row.year, 10) : defaults.year;
      // A, B, C... or I, II, III... in the row's own column, then the picked default,
      // then — for a multi-sheet workbook — a letter/numeral pulled from the tab name.
      // Falls back to "A" when nothing at all specifies a section, rather than failing
      // the whole row over what's usually a single-section class anyway.
      const section =
        normalizeSectionValue(row.section) ??
        defaults.section ??
        (row._sheet_name ? sectionFromSheetName(row._sheet_name) : undefined) ??
        "A";

      // The Roll Number's own branch code always wins over a sheet's department
      // column or tab name — it's the ground truth for which branch a student is in.
      let dept = rollNoDept;
      if (!dept && departmentText) {
        if (!deptTextCache.has(departmentText)) {
          deptTextCache.set(departmentText, await findOrCreateDepartment(departmentText));
        }
        dept = deptTextCache.get(departmentText);
      }
      dept = dept ?? defaultDept ?? sheetDept ?? undefined;

      if (!dept) {
        throw new Error("No department column in the sheet and none selected before importing");
      }
      if (year === undefined || Number.isNaN(year)) {
        throw new Error("No year column in the sheet and none selected before importing");
      }

      const email = row.email?.trim().toLowerCase() || placeholderEmail(studentId);
      const phone = row.phone?.trim() || "";
      // Defaults to the student's own Roll Number when the sheet doesn't specify one.
      const password = row.password?.trim() || studentId;

      prepared.push({ lineNo, name, studentId, email, phone, year, section, departmentId: dept.id, password });
    } catch (err) {
      errors.push({ row: lineNo, message: err instanceof Error ? err.message : "Unknown error" });
    }
  }

  const [existingEmails, existingStudentIds] = await Promise.all([
    prisma.user.findMany({ where: { email: { in: prepared.map((p) => p.email) } }, select: { email: true } }),
    prisma.student.findMany({ where: { studentId: { in: prepared.map((p) => p.studentId) } }, select: { studentId: true } }),
  ]);
  const existingEmailSet = new Set(existingEmails.map((u) => u.email));
  const existingStudentIdSet = new Set(existingStudentIds.map((s) => s.studentId));

  const seenEmails = new Set<string>();
  const seenStudentIds = new Set<string>();
  const toCreate: PreparedStudentRow[] = [];
  for (const p of prepared) {
    if (existingEmailSet.has(p.email)) {
      errors.push({ row: p.lineNo, message: `Email ${p.email} already registered` });
    } else if (existingStudentIdSet.has(p.studentId)) {
      errors.push({ row: p.lineNo, message: `Student ID ${p.studentId} already registered` });
    } else if (seenEmails.has(p.email) || seenStudentIds.has(p.studentId)) {
      errors.push({ row: p.lineNo, message: `Duplicate Roll No ${p.studentId} elsewhere in this file` });
    } else {
      seenEmails.add(p.email);
      seenStudentIds.add(p.studentId);
      toCreate.push(p);
    }
  }

  const CONCURRENCY = 15;
  for (let i = 0; i < toCreate.length; i += CONCURRENCY) {
    const batch = toCreate.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(async (p) => {
        const passwordHash = await hashPassword(p.password);
        await prisma.user.create({
          data: {
            email: p.email,
            passwordHash,
            role: "STUDENT",
            // The Roll Number is a permanent password for students — never force a change.
            mustChangePassword: false,
            student: {
              create: { fullName: p.name, studentId: p.studentId, phone: p.phone, departmentId: p.departmentId, year: p.year, section: p.section },
            },
          },
        });
      })
    );
    results.forEach((result, idx) => {
      if (result.status === "fulfilled") {
        successRows += 1;
      } else {
        errors.push({ row: batch[idx].lineNo, message: result.reason instanceof Error ? result.reason.message : "Unknown error" });
      }
    });
  }

  errors.sort((a, b) => a.row - b.row);
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
