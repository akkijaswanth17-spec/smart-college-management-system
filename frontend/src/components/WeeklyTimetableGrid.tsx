import { ReactNode } from "react";
import { motion } from "framer-motion";
import { TimetableEntry, DayOfWeek } from "../types";

const DAYS: DayOfWeek[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
const DAY_LABELS: Record<DayOfWeek, string> = {
  MONDAY: "Mon",
  TUESDAY: "Tue",
  WEDNESDAY: "Wed",
  THURSDAY: "Thu",
  FRIDAY: "Fri",
  SATURDAY: "Sat",
  SUNDAY: "Sun",
};

const TODAY_INDEX = new Date().getDay(); // 0=Sunday..6=Saturday
const TODAY_NAME = (["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"] as DayOfWeek[])[
  TODAY_INDEX
];

/** A literal school-timetable grid: time-slots down the side, days across the top — derived entirely from the real entries. */
export function WeeklyTimetableGrid({
  entries,
  renderExtra,
  /** id of the entry to visually emphasize (e.g. a faculty member's next upcoming class) */
  highlightId,
}: {
  entries: TimetableEntry[];
  renderExtra?: (entry: TimetableEntry) => ReactNode;
  highlightId?: string;
}) {
  const slotKey = (startTime: string, endTime: string) => `${startTime}|${endTime}`;
  const timeSlots = Array.from(new Set(entries.map((e) => slotKey(e.startTime, e.endTime))))
    .sort((a, b) => a.split("|")[0].localeCompare(b.split("|")[0]))
    .map((key) => {
      const [startTime, endTime] = key.split("|");
      return { startTime, endTime };
    });

  function cellEntries(day: DayOfWeek, startTime: string, endTime: string) {
    return entries.filter((e) => e.day === day && e.startTime === startTime && e.endTime === endTime);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[780px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 w-24 border-b border-r border-slate-200 bg-slate-50 p-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Time
              </th>
              {DAYS.map((day) => {
                const isToday = day === TODAY_NAME;
                return (
                  <th
                    key={day}
                    className={`min-w-[110px] border-b border-l border-slate-200 p-3 text-[11px] font-bold uppercase tracking-wide ${
                      isToday ? "bg-brand-600 text-white" : "bg-slate-50 text-slate-500"
                    }`}
                  >
                    {DAY_LABELS[day]}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map((slot, rowIndex) => (
              <tr key={rowIndex} className="border-b border-slate-100 last:border-0">
                <td className="sticky left-0 z-10 border-r border-slate-200 bg-slate-50/90 px-3 py-2 align-top text-[11px] font-semibold leading-tight text-slate-500 whitespace-nowrap">
                  {slot.startTime}
                  <br />
                  <span className="text-slate-300">{slot.endTime}</span>
                </td>
                {DAYS.map((day) => {
                  const isToday = day === TODAY_NAME;
                  const items = cellEntries(day, slot.startTime, slot.endTime);
                  return (
                    <td
                      key={day}
                      className={`border-l border-slate-100 p-1.5 align-top ${isToday ? "bg-brand-50/40" : ""}`}
                    >
                      {items.length === 0 ? (
                        <div className="min-h-[58px]" />
                      ) : (
                        <div className="space-y-1">
                          {items.map((e) => {
                            const isNext = e.id === highlightId;
                            return (
                              <motion.div
                                key={e.id}
                                initial={{ opacity: 0, scale: 0.96 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.2 }}
                                className={`rounded-lg border p-2 text-xs transition-colors ${
                                  isNext
                                    ? "border-gold-300 bg-gold-50 ring-1 ring-gold-200"
                                    : "border-brand-100 bg-brand-50/70 hover:bg-brand-50"
                                }`}
                              >
                                {isNext && (
                                  <span className="mb-0.5 inline-block rounded-full bg-gold-400 px-1.5 py-0.5 text-[9px] font-bold uppercase text-brand-900">
                                    Next
                                  </span>
                                )}
                                <p className={`truncate font-semibold ${isNext ? "text-gold-700" : "text-brand-800"}`}>
                                  {e.subject?.name}
                                </p>
                                {e.faculty?.fullName && <p className="truncate text-slate-500">{e.faculty.fullName}</p>}
                                <p className="truncate text-slate-400">
                                  Room {e.room?.number}
                                  {items.length > 1 ? ` · Y${e.year}-${e.section}` : ""}
                                </p>
                                {renderExtra && <div className="mt-1">{renderExtra(e)}</div>}
                              </motion.div>
                            );
                          })}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
