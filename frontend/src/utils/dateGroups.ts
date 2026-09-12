import { isToday, isYesterday, format } from "date-fns";

export function dayLabel(date: Date): string {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "dd MMM yyyy");
}

/** Groups a list of dated items into ["Today" | "Yesterday" | "dd MMM yyyy", items][], preserving input order. */
export function groupByDay<T>(items: T[], getDate: (item: T) => string | Date): [string, T[]][] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const date = getDate(item);
    const label = dayLabel(typeof date === "string" ? new Date(date) : date);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(item);
  }
  return Array.from(groups.entries());
}
