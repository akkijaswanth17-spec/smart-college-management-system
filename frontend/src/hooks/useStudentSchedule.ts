import { useEffect, useState } from "react";
import { timetableService } from "../services/timetable.service";
import { TimetableEntry, DayOfWeek, StudentProfile } from "../types";
import { classifySchedule, ScheduleStatus } from "../utils/schedule";

const DAY_NAMES: DayOfWeek[] = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

export interface ScheduleEntry extends TimetableEntry {
  status: ScheduleStatus;
}

/** Live view of a student's own timetable, scoped to their department/year/section. */
export function useStudentSchedule(student: StudentProfile | null | undefined) {
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    if (!student) return;
    setLoading(true);
    timetableService
      .list({ departmentId: student.departmentId, year: student.year, section: student.section })
      .then(setEntries)
      .finally(() => setLoading(false));
  }, [student?.departmentId, student?.year, student?.section]);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(interval);
  }, []);

  const todayName = DAY_NAMES[now.getDay()];
  const rawToday = entries.filter((e) => e.day === todayName);
  const todaysSchedule = classifySchedule(rawToday, now);

  const liveClass = todaysSchedule.find((e) => e.status === "live") ?? null;
  const nextClass = todaysSchedule.find((e) => e.status === "next") ?? null;

  return { entries, todaysSchedule, liveClass, nextClass, loading };
}
