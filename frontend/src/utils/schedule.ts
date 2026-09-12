export type ScheduleStatus = "done" | "live" | "next" | "upcoming";

interface Timed {
  startTime: string;
  endTime: string;
}

function minutesSinceMidnight(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Classifies a list of same-day entries (already sorted or not) into done/live/next/upcoming relative to `now`. */
export function classifySchedule<T extends Timed>(entries: T[], now: Date): (T & { status: ScheduleStatus })[] {
  const sorted = [...entries].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nextIndex = sorted.findIndex((e) => minutesSinceMidnight(e.startTime) > nowMinutes);

  return sorted.map((e, i) => {
    const start = minutesSinceMidnight(e.startTime);
    const end = minutesSinceMidnight(e.endTime);
    let status: ScheduleStatus;
    if (nowMinutes >= start && nowMinutes < end) status = "live";
    else if (nowMinutes >= end) status = "done";
    else if (i === nextIndex) status = "next";
    else status = "upcoming";
    return { ...e, status };
  });
}
