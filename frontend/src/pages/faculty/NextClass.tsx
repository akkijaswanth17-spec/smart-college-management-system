import { motion } from "framer-motion";
import { Clock, MapPin, Building2, CalendarClock, User } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { SkeletonCard } from "../../components/ui/Skeleton";
import { useFacultyTimetable } from "../../hooks/useFacultyTimetable";

export default function FacultyNextClass() {
  const { nextClass, minutesUntilNext, isImminent, loading } = useFacultyTimetable();

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Next Class</h1>
        <p className="text-sm text-slate-500">You'll get an in-app reminder 5 minutes before it starts.</p>
      </div>

      {loading ? (
        <SkeletonCard />
      ) : nextClass ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 12 }}
          animate={{ opacity: 1, y: 0, scale: isImminent ? [1, 1.01, 1] : 1 }}
          transition={
            isImminent
              ? { scale: { duration: 2.4, repeat: Infinity, ease: "easeInOut" }, opacity: { duration: 0.4 }, y: { duration: 0.4 } }
              : { duration: 0.4 }
          }
          className={`overflow-hidden rounded-2xl bg-gradient-to-br from-brand-700 to-brand-900 p-8 text-white shadow-lg ${
            isImminent ? "ring-2 ring-gold-400/70" : ""
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gold-300">
            <CalendarClock className="h-4 w-4" /> Next Class
          </div>
          <h2 className="mt-3 text-3xl font-bold">{nextClass.subject?.name}</h2>
          <div className="mt-5 space-y-2.5 text-sm text-brand-100">
            <p className="flex items-center gap-2">
              <Clock className="h-4 w-4" /> {nextClass.startTime} — {nextClass.endTime}
            </p>
            <p className="flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Room {nextClass.room?.number}
            </p>
            <p className="flex items-center gap-2">
              <Building2 className="h-4 w-4" /> {nextClass.block?.name}
            </p>
            <p className="flex items-center gap-2">
              <User className="h-4 w-4" /> Year {nextClass.year} - Section {nextClass.section}
            </p>
          </div>
          {minutesUntilNext !== null && (
            <p
              className={`mt-6 inline-block rounded-full px-5 py-2 text-base font-bold ${
                isImminent ? "bg-gold-400 text-brand-900" : "bg-white/15"
              }`}
            >
              {isImminent
                ? `Your class starts in ${minutesUntilNext} minute${minutesUntilNext === 1 ? "" : "s"}`
                : `Starts in ${minutesUntilNext} minute${minutesUntilNext === 1 ? "" : "s"}`}
            </p>
          )}
        </motion.div>
      ) : (
        <Card>
          <EmptyState icon={CalendarClock} title="No more classes today" description="Check back tomorrow, or view your full timetable." />
        </Card>
      )}
    </div>
  );
}
