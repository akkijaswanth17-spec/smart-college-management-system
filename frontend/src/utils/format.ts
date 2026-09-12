import { format, parseISO } from "date-fns";

export function formatDate(date: string | Date | null, pattern = "dd MMM yyyy"): string {
  if (!date) return "—";
  const d = typeof date === "string" ? parseISO(date) : date;
  try {
    return format(d, pattern);
  } catch {
    return "—";
  }
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export const DAYS_OF_WEEK = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"] as const;

/** "2026-2027" -> "26-27" */
export function shortAcademicYear(academicYear: string): string {
  const match = academicYear.match(/^(\d{2})(\d{2})-(\d{2})(\d{2})$/);
  return match ? `${match[2]}-${match[4]}` : academicYear;
}
