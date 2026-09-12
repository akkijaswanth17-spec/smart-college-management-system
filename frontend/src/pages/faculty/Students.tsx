import { useState } from "react";
import { Search, Users } from "lucide-react";
import { usePaginatedList } from "../../hooks/usePaginatedList";
import { studentsService } from "../../services/students.service";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Pagination } from "../../components/ui/Pagination";
import { SkeletonTable } from "../../components/ui/Skeleton";
import { StudentProfile } from "../../types";

export default function FacultyStudents() {
  const [search, setSearch] = useState("");
  const { items, meta, page, setPage, loading } = usePaginatedList<StudentProfile>(studentsService.list, {
    search: search || undefined,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Students</h1>
        <p className="text-sm text-slate-500">Search and browse student records.</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, ID or email..."
          className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
      </div>

      {loading ? (
        <SkeletonTable cols={5} />
      ) : items.length === 0 ? (
        <EmptyState icon={Users} title="No students found" />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Student ID</th>
                  <th className="px-5 py-3">Department</th>
                  <th className="px-5 py-3">Year / Section</th>
                  <th className="px-5 py-3">Email</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-800">{s.fullName}</td>
                    <td className="px-5 py-3 text-slate-500">{s.studentId}</td>
                    <td className="px-5 py-3 text-slate-500">{s.department?.code}</td>
                    <td className="px-5 py-3 text-slate-500">
                      Year {s.year} - {s.section}
                    </td>
                    <td className="px-5 py-3 text-slate-500">{s.user?.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination meta={{ ...meta, page }} onPageChange={setPage} />
        </Card>
      )}
    </div>
  );
}
