import { motion } from "framer-motion";
import { Clock, MapPin, Radio, CheckCircle2 } from "lucide-react";
import { ScheduleStatus } from "../utils/schedule";

interface StripEntry {
  id: string;
  startTime: string;
  endTime: string;
  status: ScheduleStatus;
  subject?: { name: string };
  faculty?: { fullName: string };
  room?: { number: string };
  block?: { name: string };
  year?: number;
  section?: string;
}

const STATUS_STYLES: Record<ScheduleStatus, string> = {
  done: "border-slate-200 bg-slate-50 opacity-60",
  live: "border-emerald-300 bg-emerald-50 ring-1 ring-emerald-200",
  next: "border-gold-300 bg-gold-50 ring-1 ring-gold-200",
  upcoming: "border-slate-200 bg-white",
};

/** A horizontally-scrolling row of same-day classes with a live "in progress / next" indicator. */
export function ScheduleStrip({ entries }: { entries: StripEntry[] }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {entries.map((entry, i) => (
        <motion.div
          key={entry.id}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: i * 0.05, ease: "easeOut" }}
          className={`flex min-w-[220px] shrink-0 flex-col gap-2 rounded-2xl border p-4 transition-all duration-200 ${STATUS_STYLES[entry.status]}`}
        >
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-xs font-semibold text-slate-500">
              <Clock className="h-3.5 w-3.5" />
              {entry.startTime} – {entry.endTime}
            </span>
            {entry.status === "live" && (
              <span className="flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                <Radio className="h-2.5 w-2.5 animate-pulse" /> Live
              </span>
            )}
            {entry.status === "next" && (
              <span className="rounded-full bg-gold-400 px-2 py-0.5 text-[10px] font-bold uppercase text-brand-900">Next</span>
            )}
            {entry.status === "done" && <CheckCircle2 className="h-3.5 w-3.5 text-slate-400" />}
          </div>
          <p className="truncate font-serif text-sm font-bold text-brand-950">{entry.subject?.name}</p>
          {entry.faculty?.fullName && <p className="truncate text-xs text-slate-500">{entry.faculty.fullName}</p>}
          {(entry.year || entry.section) && (
            <p className="text-xs text-slate-400">
              Year {entry.year} - {entry.section}
            </p>
          )}
          <p className="flex items-center gap-1 text-xs text-slate-400">
            <MapPin className="h-3 w-3" /> Room {entry.room?.number}, {entry.block?.name}
          </p>
        </motion.div>
      ))}
    </div>
  );
}
