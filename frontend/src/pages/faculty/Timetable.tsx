import { CalendarDays } from "lucide-react";
import { WeeklyTimetableGrid } from "../../components/WeeklyTimetableGrid";
import { SkeletonTimetable } from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/ui/EmptyState";
import { useFacultyTimetable } from "../../hooks/useFacultyTimetable";

export default function FacultyTimetable() {
  const { entries, nextClass, loading } = useFacultyTimetable();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">My Timetable</h1>
        <p className="text-sm text-slate-500">Your weekly class schedule.</p>
      </div>

      {loading ? (
        <SkeletonTimetable />
      ) : entries.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No timetable assigned yet" description="Contact the administration if this seems wrong." />
      ) : (
        <WeeklyTimetableGrid entries={entries} highlightId={nextClass?.id} />
      )}
    </div>
  );
}
