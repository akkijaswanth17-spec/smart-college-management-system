import { DateTime } from "luxon";
import { prisma } from "../config/prisma";
import { env } from "../config/env";

const DAY_NAMES = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"] as const;

export function todayInCollegeTz() {
  return DateTime.now().setZone(env.collegeTimezone);
}

/** YYYY-MM-DD for today in college local time — the only date "today" ever means server-side. */
export function todayDateString() {
  return todayInCollegeTz().toFormat("yyyy-MM-dd");
}

export function todayDayName() {
  const now = todayInCollegeTz();
  return DAY_NAMES[now.weekday - 1];
}

/**
 * Period numbers aren't stored on TimetableEntry — they're derived by sorting
 * every entry for a given class+day by start time. This keeps period numbers
 * consistent with the timetable itself (the single source of truth) instead
 * of duplicating a period field that could drift out of sync.
 */
export async function periodsForClassDay(departmentId: string, year: number, section: string, day: string) {
  const entries = await prisma.timetableEntry.findMany({
    where: { departmentId, year, section, day: day as any, isActive: true },
    include: {
      faculty: { select: { id: true, fullName: true, title: true } },
      subject: { select: { id: true, name: true, code: true } },
    },
    orderBy: { startTime: "asc" },
  });
  return entries.map((e, i) => ({ ...e, period: i + 1 }));
}

/** Among today's periods for a class, which one (if any) is happening right now. */
export function findCurrentPeriod<T extends { startTime: string; endTime: string }>(
  periods: T[],
  nowHHMM: string
): T | undefined {
  return periods.find((p) => p.startTime <= nowHHMM && nowHHMM < p.endTime);
}

/** A faculty member's own periods for today, across every class they teach, with the correct
 * class-wide period number (not just their own position among their own classes). */
export async function myTodayPeriods(facultyId: string) {
  const day = todayDayName();
  const myEntries = await prisma.timetableEntry.findMany({
    where: { facultyId, day: day as any, isActive: true },
    select: { departmentId: true, year: true, section: true },
  });

  const classKeys = Array.from(
    new Map(myEntries.map((e) => [`${e.departmentId}:${e.year}:${e.section}`, e])).values()
  );

  const results: Array<
    Awaited<ReturnType<typeof periodsForClassDay>>[number] & { alreadyTaken: boolean }
  > = [];

  for (const cls of classKeys) {
    const periods = await periodsForClassDay(cls.departmentId, cls.year, cls.section, day);
    for (const p of periods.filter((p) => p.facultyId === facultyId)) {
      const existing = await prisma.attendanceRecord.findFirst({
        where: { timetableEntryId: p.id, date: new Date(todayDateString()) },
        select: { id: true },
      });
      results.push({ ...p, alreadyTaken: !!existing });
    }
  }

  return results.sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export function calcPercentage(present: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((present / total) * 10000) / 100;
}
