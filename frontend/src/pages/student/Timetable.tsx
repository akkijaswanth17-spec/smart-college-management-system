import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { WeeklyTimetableGrid } from "../../components/WeeklyTimetableGrid";
import { SkeletonTimetable } from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/ui/EmptyState";
import { useAuth } from "../../context/AuthContext";
import { timetableService } from "../../services/timetable.service";
import { TimetableEntry } from "../../types";

export default function StudentTimetable() {
  const { user } = useAuth();
  const student = user?.student;
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!student) return;
    timetableService
      .list({ departmentId: student.departmentId, year: student.year, section: student.section })
      .then(setEntries)
      .finally(() => setLoading(false));
  }, [student]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">My Timetable</h1>
        <p className="text-sm text-slate-500">
          {student?.department?.name} &middot; Year {student?.year} &middot; Section {student?.section}
        </p>
      </div>

      {loading ? (
        <SkeletonTimetable />
      ) : entries.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No timetable published yet" description="Check back once the administration publishes your schedule." />
      ) : (
        <WeeklyTimetableGrid entries={entries} />
      )}
    </div>
  );
}
