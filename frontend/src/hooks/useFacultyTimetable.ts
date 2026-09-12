import { useEffect, useState } from "react";
import { timetableService } from "../services/timetable.service";
import { TimetableEntry, DayOfWeek } from "../types";
import { classifySchedule } from "../utils/schedule";

const DAY_NAMES: DayOfWeek[] = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

function minutesSinceMidnight(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function useFacultyTimetable() {
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    timetableService
      .my()
      .then(setEntries)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(interval);
  }, []);

  const todayName = DAY_NAMES[now.getDay()];
  const todaysClasses = entries
    .filter((e) => e.day === todayName)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nextClass = todaysClasses.find((e) => minutesSinceMidnight(e.startTime) > nowMinutes) ?? null;
  const minutesUntilNext = nextClass ? minutesSinceMidnight(nextClass.startTime) - nowMinutes : null;
  const isImminent = minutesUntilNext !== null && minutesUntilNext <= 5;
  const todaysWithStatus = classifySchedule(todaysClasses, now);

  return { entries, todaysClasses, todaysWithStatus, nextClass, minutesUntilNext, isImminent, loading };
}
