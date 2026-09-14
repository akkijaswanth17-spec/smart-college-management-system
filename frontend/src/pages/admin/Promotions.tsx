import { useEffect, useState } from "react";
import { ArrowRight, GraduationCap } from "lucide-react";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Select } from "../../components/ui/FormField";
import { EmptyState } from "../../components/ui/EmptyState";
import { SkeletonTable } from "../../components/ui/Skeleton";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { metaService } from "../../services/meta.service";
import { promotionService, PromotionStudentRow } from "../../services/promotion.service";
import { useToast } from "../../context/ToastContext";
import { getErrorMessage } from "../../services/api";
import { Department } from "../../types";
import { CLASS_OPTIONS, SECTION_OPTIONS, ACADEMIC_YEAR_OPTIONS } from "../../constants/academicClass";

const currentAcademicYear = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function Promotions() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentId, setDepartmentId] = useState("");
  const [classKey, setClassKey] = useState(CLASS_OPTIONS[0].key);
  const [section, setSection] = useState(SECTION_OPTIONS[0]);
  const [academicYear, setAcademicYear] = useState(
    ACADEMIC_YEAR_OPTIONS.includes(currentAcademicYear) ? currentAcademicYear : ACADEMIC_YEAR_OPTIONS[ACADEMIC_YEAR_OPTIONS.length - 1]
  );

  const [rows, setRows] = useState<PromotionStudentRow[] | null>(null);
  const [detained, setDetained] = useState<Set<string>>(new Set());
  const [condoned, setCondoned] = useState<Set<string>>(new Set());
  const [loadingSheet, setLoadingSheet] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const toast = useToast();

  useEffect(() => {
    metaService.departments().then(setDepartments);
  }, []);

  const currentOption = CLASS_OPTIONS.find((o) => o.key === classKey)!;
  const currentIndex = CLASS_OPTIONS.findIndex((o) => o.key === classKey);
  const nextOption = CLASS_OPTIONS[currentIndex + 1] ?? null;

  const canLoad = departmentId && section.trim();

  async function loadSheet() {
    if (!canLoad) return;
    setLoadingSheet(true);
    setRows(null);
    setDetained(new Set());
    setCondoned(new Set());
    try {
      const students = await promotionService.getSheet({
        departmentId,
        year: currentOption.year,
        section: section.trim().toUpperCase(),
      });
      // The sheet is keyed by (department, year, section) — this class option's
      // semester narrows it further to just the students actually at this stage
      // (e.g. Year 2 holds both 3rd and 4th Sem, tracked via `semester`).
      setRows(students.filter((s) => s.semester === currentOption.semester));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoadingSheet(false);
    }
  }

  function toggleDetain(id: string) {
    setDetained((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleCondone(id: string) {
    setCondoned((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const promoteCount = rows ? rows.filter((r) => !detained.has(r.id)).length : 0;

  async function handlePromote() {
    if (!rows || !nextOption) return;
    setPromoting(true);
    try {
      const promote = rows.filter((r) => !detained.has(r.id)).map((r) => r.id);
      const result = await promotionService.promote({
        toYear: nextOption.year,
        toSemester: nextOption.semester,
        academicYear,
        promote,
        detain: Array.from(detained),
        condone: Array.from(condoned),
      });
      toast.success(`Promoted ${result.promoted} student(s) to ${nextOption.label}${result.detained ? ` — ${result.detained} detained` : ""}`);
      setRows(null);
      setDetained(new Set());
      setCondoned(new Set());
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setPromoting(false);
      setConfirmOpen(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-brand-600" />
          <h2 className="font-semibold text-slate-800">Year / Semester Promotion</h2>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Load a class, mark anyone to detain (held back) or condone, then promote everyone else to the next
          semester in one go.
        </p>
      </CardHeader>
      <CardBody className="space-y-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Select label="Department" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
            <option value="">Select</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
          <Select label="Year" value={classKey} onChange={(e) => setClassKey(e.target.value)}>
            {CLASS_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </Select>
          <Select label="Section" value={section} onChange={(e) => setSection(e.target.value)}>
            {SECTION_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <Select label="Academic Year" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)}>
            {ACADEMIC_YEAR_OPTIONS.map((ay) => (
              <option key={ay} value={ay}>
                {ay}
              </option>
            ))}
          </Select>
        </div>

        <Button onClick={loadSheet} disabled={!canLoad} loading={loadingSheet}>
          Load Sheet
        </Button>

        {loadingSheet && <SkeletonTable cols={3} />}

        {!loadingSheet && rows && rows.length === 0 && (
          <EmptyState
            icon={GraduationCap}
            title="No students found"
            description="No students match that department, year and section."
          />
        )}

        {!loadingSheet && rows && rows.length > 0 && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gold-200 bg-gold-50 px-4 py-3">
              <p className="flex items-center gap-2 text-sm font-semibold text-brand-900">
                {currentOption.label}
                {nextOption ? (
                  <>
                    <ArrowRight className="h-4 w-4 text-gold-600" /> {nextOption.label}
                  </>
                ) : (
                  <span className="font-normal text-slate-500">— final semester, nothing further to promote to</span>
                )}
              </p>
              <p className="text-xs text-slate-500">
                <span className="font-bold text-brand-900">{rows.length}</span> students loaded
              </p>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">Student</th>
                    <th className="px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500">Condonation</th>
                    <th className="px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500">Detain</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((r, i) => (
                    <tr key={r.id} className={i % 2 === 1 ? "bg-slate-50" : "bg-white"}>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-800 text-[11px] font-bold text-white">
                            {initials(r.fullName)}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-serif font-semibold text-brand-950">{r.fullName}</p>
                            <p className="text-xs text-slate-400">{r.studentId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-gold-600"
                          checked={condoned.has(r.id)}
                          onChange={() => toggleCondone(r.id)}
                        />
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-maroon-600"
                          checked={detained.has(r.id)}
                          onChange={() => toggleDetain(r.id)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Button onClick={() => setConfirmOpen(true)} disabled={!nextOption || promoteCount === 0}>
              Promote ({promoteCount} student{promoteCount === 1 ? "" : "s"})
            </Button>
          </div>
        )}
      </CardBody>

      <ConfirmDialog
        open={confirmOpen}
        title="Promote students?"
        message={
          nextOption
            ? `${promoteCount} student(s) will move from ${currentOption.label} to ${nextOption.label}. ${
                detained.size > 0 ? `${detained.size} detained student(s) will stay at ${currentOption.label}.` : ""
              } This can't be undone from here — you'd need to edit each student individually to reverse it.`
            : ""
        }
        confirmLabel="Promote"
        danger={false}
        loading={promoting}
        onConfirm={handlePromote}
        onCancel={() => setConfirmOpen(false)}
      />
    </Card>
  );
}

export default Promotions;
