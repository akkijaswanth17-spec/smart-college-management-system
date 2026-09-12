/**
 * The class-level picker used everywhere a Year is selected (Students,
 * Timetable, Marks). Students/admins think in terms of "1st Year" as a
 * whole, then semester pairs for years 2 and 3 — this is the single source
 * of truth for that list so every dropdown in the app stays in sync.
 * Each option still resolves to the underlying Student.year (1/2/3) the
 * API expects; `semester` (1-6, or null for 1st Year) is a separate,
 * purely informational field stored on the student record.
 */
export const CLASS_OPTIONS = [
  { key: "1", label: "1st Year", year: 1, semester: null as number | null },
  { key: "3", label: "3rd Sem", year: 2, semester: 3 },
  { key: "4", label: "4th Sem", year: 2, semester: 4 },
  { key: "5", label: "5th Sem", year: 3, semester: 5 },
  { key: "6", label: "6th Sem", year: 3, semester: 6 },
];

export const SECTION_OPTIONS = ["A", "B", "C", "D"];

export const ACADEMIC_YEAR_OPTIONS = ["2024-2025", "2025-2026", "2026-2027"];

/** Find the class option matching a stored (year, semester) pair — falls back to matching by year alone. */
export function classKeyFor(year: number, semester?: number | null): string {
  const bySemester = semester ? CLASS_OPTIONS.find((o) => o.semester === semester) : undefined;
  if (bySemester) return bySemester.key;
  return CLASS_OPTIONS.find((o) => o.year === year)?.key ?? CLASS_OPTIONS[0].key;
}
