import { useEffect, useMemo, useState } from "react";
import { Search, GraduationCap } from "lucide-react";
import { marksService } from "../../services/marks.service";
import { useToast } from "../../context/ToastContext";
import { getErrorMessage } from "../../services/api";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { SkeletonTable } from "../../components/ui/Skeleton";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { shortAcademicYear } from "../../utils/format";
import { MyMark } from "../../types";

type ExamTab = "all" | "mid1" | "mid2" | "semester";

const TABS: { key: ExamTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "mid1", label: "Mid 1" },
  { key: "mid2", label: "Mid 2" },
  { key: "semester", label: "Semester" },
];

function ScoreCell({ value }: { value: number | null }) {
  if (value === null) return <span className="text-slate-300">—</span>;
  return <span className="font-serif font-bold text-brand-950">{value}</span>;
}

export default function StudentMarks() {
  const [marks, setMarks] = useState<MyMark[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<ExamTab>("all");
  const toast = useToast();

  useEffect(() => {
    marksService
      .getMine()
      .then(setMarks)
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return marks;
    return marks.filter((m) => m.subject.name.toLowerCase().includes(q) || m.subject.code.toLowerCase().includes(q));
  }, [marks, search]);

  const tabLabel = TABS.find((t) => t.key === tab)?.label ?? "All";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Marks</h1>
        <p className="text-sm text-slate-500">Your internal assessment marks — Mid 1, Mid 2 and Semester — by subject.</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-md px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                tab === t.key ? "bg-white text-brand-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative max-w-sm flex-1 sm:flex-none">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by subject..."
            className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </div>
      </div>

      {loading ? (
        <SkeletonTable cols={4} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title={marks.length === 0 ? "No marks published yet" : "No matching subjects"}
          description={marks.length === 0 ? "Your marks will appear here once the college publishes them." : undefined}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <SectionHeader
              title={tab === "all" ? "Subject-wise Marks" : `${tabLabel} Marks`}
              action={
                marks[0] ? (
                  <span className="text-xs font-semibold text-slate-400">A.Y. {shortAcademicYear(marks[0].academicYear)}</span>
                ) : undefined
              }
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Subject</th>
                  {tab === "all" ? (
                    <>
                      <th className="px-5 py-3">Mid 1</th>
                      <th className="px-5 py-3">Mid 2</th>
                      <th className="px-5 py-3">Semester</th>
                    </>
                  ) : (
                    <th className="px-5 py-3">{tabLabel}</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-800">{m.subject.name}</p>
                      <p className="text-xs text-slate-400">{m.subject.code}</p>
                    </td>
                    {tab === "all" ? (
                      <>
                        <td className="px-5 py-3">
                          <ScoreCell value={m.mid1} />
                        </td>
                        <td className="px-5 py-3">
                          <ScoreCell value={m.mid2} />
                        </td>
                        <td className="px-5 py-3">
                          <ScoreCell value={m.semester} />
                        </td>
                      </>
                    ) : (
                      <td className="px-5 py-3">
                        <ScoreCell value={tab === "mid1" ? m.mid1 : tab === "mid2" ? m.mid2 : m.semester} />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
