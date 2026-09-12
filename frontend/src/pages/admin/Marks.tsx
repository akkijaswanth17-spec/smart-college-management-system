import { useEffect, useState } from "react";
import { Search, GraduationCap, Trash2 } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { SkeletonTable } from "../../components/ui/Skeleton";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { ImportCard } from "./DataImport";
import { MarksSheetEditor } from "./MarksSheetEditor";
import { marksService } from "../../services/marks.service";
import { useToast } from "../../context/ToastContext";
import { getErrorMessage } from "../../services/api";
import { AdminMark } from "../../types";

export default function AdminMarks() {
  const [marks, setMarks] = useState<AdminMark[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<AdminMark | null>(null);
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  async function reload() {
    setLoading(true);
    try {
      const data = await marksService.list({ search: search || undefined });
      setMarks(data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(reload, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await marksService.remove(deleteTarget.id);
      toast.success("Mark record removed");
      setDeleteTarget(null);
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Marks</h1>
        <p className="text-sm text-slate-500">
          Import internal assessment marks from an Excel sheet — each student can only ever see their own results.
        </p>
      </div>

      <MarksSheetEditor />

      <ImportCard
        title="Import Marks from Excel"
        icon={GraduationCap}
        columns={["roll_number", "subject", "mid1", "mid2", "sem"]}
        onImport={marksService.import}
        templateHref="/import-templates/marks.csv"
        accept=".csv,.xlsx,.xls"
      />

      <div>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Imported Records</h2>

        <div className="relative mb-4 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student name or roll number..."
            className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </div>

        {loading ? (
          <SkeletonTable cols={6} />
        ) : marks.length === 0 ? (
          <EmptyState icon={GraduationCap} title="No marks imported yet" description="Upload an Excel sheet above to get started." />
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Student</th>
                    <th className="px-5 py-3">Subject</th>
                    <th className="px-5 py-3">Mid 1</th>
                    <th className="px-5 py-3">Mid 2</th>
                    <th className="px-5 py-3">Semester</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {marks.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <p className="font-medium text-slate-800">{m.student.fullName}</p>
                        <p className="text-xs text-slate-400">
                          {m.student.studentId} · Year {m.student.year} - {m.student.section}
                        </p>
                      </td>
                      <td className="px-5 py-3 text-slate-600">{m.subject.name}</td>
                      <td className="px-5 py-3 text-slate-600">{m.mid1 ?? "—"}</td>
                      <td className="px-5 py-3 text-slate-600">{m.mid2 ?? "—"}</td>
                      <td className="px-5 py-3 text-slate-600">{m.semester ?? "—"}</td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => setDeleteTarget(m)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          aria-label="Delete mark record"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete mark record?"
        message={`Marks for ${deleteTarget?.student.fullName} in ${deleteTarget?.subject.name} will be removed.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
