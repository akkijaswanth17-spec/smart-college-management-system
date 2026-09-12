import { useEffect, useRef, useState, KeyboardEvent } from "react";
import { FileSpreadsheet, Save, FileDown, ImageDown } from "lucide-react";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Select } from "../../components/ui/FormField";
import { EmptyState } from "../../components/ui/EmptyState";
import { SkeletonTable } from "../../components/ui/Skeleton";
import { metaService } from "../../services/meta.service";
import { marksService } from "../../services/marks.service";
import { useToast } from "../../context/ToastContext";
import { getErrorMessage } from "../../services/api";
import { Department, MarksSheetSubject, MarksSheetRow, ExamType } from "../../types";
import { CLASS_OPTIONS, SECTION_OPTIONS, ACADEMIC_YEAR_OPTIONS } from "../../constants/academicClass";

const currentAcademicYear = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

const EXAM_OPTIONS: { value: ExamType; label: string }[] = [
  { value: "mid1", label: "Mid 1" },
  { value: "mid2", label: "Mid 2" },
  { value: "semester", label: "Semester" },
];

function cellId(studentId: string, subjectId: string) {
  return `score-${studentId}-${subjectId}`;
}

// Short column headers so more subjects fit without scrolling/cutting off — falls back to the
// full subject name for anything not in this list.
const SUBJECT_ABBREVIATIONS: Record<string, string> = {
  "Android Programming": "AP",
  "Big Data & Cloud Computing": "BDCC",
  "Industrial Management and Entrepreneurship": "IME",
  "Internet Of Things": "IOT",
  "Life Skills": "Life Skills",
  "Python Programming": "PP",
};

function subjectLabel(name: string) {
  return SUBJECT_ABBREVIATIONS[name] ?? name;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

/** Score input: keeps the field genuinely blank (not "0") until the admin types something, with the
 * browser's up/down spinner removed and spreadsheet-style arrow-key navigation to neighboring cells. */
function ScoreInput({
  id,
  value,
  onChange,
  onNavigate,
}: {
  id: string;
  value: number | null;
  onChange: (v: number | null) => void;
  onNavigate: (key: string) => void;
}) {
  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter"].includes(e.key)) {
      e.preventDefault();
      onNavigate(e.key);
    }
  }

  return (
    <input
      id={id}
      type="number"
      min={0}
      max={999}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      onKeyDown={handleKeyDown}
      className="w-20 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-center text-sm font-semibold text-brand-950 [appearance:textfield] transition-shadow focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-200 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
    />
  );
}

export function MarksSheetEditor() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentId, setDepartmentId] = useState("");
  const [classKey, setClassKey] = useState(CLASS_OPTIONS[0].key);
  const year = CLASS_OPTIONS.find((o) => o.key === classKey)!.year;
  const [section, setSection] = useState(SECTION_OPTIONS[0]);
  const [examType, setExamType] = useState<ExamType>("mid1");
  const [academicYear, setAcademicYear] = useState(
    ACADEMIC_YEAR_OPTIONS.includes(currentAcademicYear) ? currentAcademicYear : ACADEMIC_YEAR_OPTIONS[ACADEMIC_YEAR_OPTIONS.length - 1]
  );

  const [subjects, setSubjects] = useState<MarksSheetSubject[] | null>(null);
  const [rows, setRows] = useState<MarksSheetRow[] | null>(null);
  const [loadingSheet, setLoadingSheet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState<"pdf" | "image" | null>(null);
  const toast = useToast();
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    metaService.departments().then(setDepartments);
  }, []);

  const canLoad = departmentId && year && section.trim();

  async function loadSheet() {
    if (!canLoad) return;
    setLoadingSheet(true);
    setRows(null);
    setSubjects(null);
    try {
      const sheet = await marksService.getSheet({
        departmentId,
        year,
        section: section.trim().toUpperCase(),
        examType,
        academicYear,
      });
      setSubjects(sheet.subjects);
      setRows(sheet.students);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoadingSheet(false);
    }
  }

  function updateScore(studentId: string, subjectId: string, value: number | null) {
    setRows((prev) =>
      prev
        ? prev.map((r) => (r.studentId === studentId ? { ...r, scores: { ...r.scores, [subjectId]: value } } : r))
        : prev
    );
  }

  function navigateFrom(rowIndex: number, colIndex: number, key: string) {
    if (!rows || !subjects) return;
    let targetRow = rowIndex;
    let targetCol = colIndex;
    if (key === "ArrowUp") targetRow -= 1;
    else if (key === "ArrowDown" || key === "Enter") targetRow += 1;
    else if (key === "ArrowLeft") targetCol -= 1;
    else if (key === "ArrowRight") targetCol += 1;

    if (targetRow < 0 || targetRow >= rows.length || targetCol < 0 || targetCol >= subjects.length) return;

    const targetId = cellId(rows[targetRow].studentId, subjects[targetCol].id);
    const el = document.getElementById(targetId) as HTMLInputElement | null;
    el?.focus();
    el?.select();
  }

  async function handleSave() {
    if (!rows || !subjects) return;
    setSaving(true);
    try {
      const entries = rows.flatMap((r) =>
        subjects.map((s) => ({ studentId: r.studentId, subjectId: s.id, value: r.scores[s.id] ?? null }))
      );
      await marksService.saveSheet({ examType, academicYear, entries });
      toast.success(`Saved ${EXAM_OPTIONS.find((o) => o.value === examType)?.label} marks for ${rows.length} students`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function triggerDownload(href: string, filename: string) {
    const a = document.createElement("a");
    a.href = href;
    a.download = filename;
    a.click();
  }

  function sheetFileName() {
    const dept = departments.find((d) => d.id === departmentId)?.code ?? "class";
    const classLabel = CLASS_OPTIONS.find((o) => o.key === classKey)?.label.replace(/\s+/g, "-") ?? "";
    const examLabel = EXAM_OPTIONS.find((o) => o.value === examType)?.label.replace(/\s+/g, "-") ?? "";
    return `${dept}-${classLabel}-${section}-${examLabel}-marks`;
  }

  /** Captures the full sheet at its true content width. Rather than trust html2canvas's
   * clone/onclone machinery to un-clip the scrollable area (unreliable in practice), this
   * temporarily widens the REAL DOM — overflow visible, sticky cells pinned to normal flow —
   * captures it, then puts everything back exactly as it was. */
  async function captureSheet(html2canvas: typeof import("html2canvas-pro").default) {
    const target = exportRef.current!;
    const scrollArea = target.querySelector<HTMLElement>("[data-export-scroll]");
    const stickyEls = Array.from(target.querySelectorAll<HTMLElement>(".sticky"));

    const restore: (() => void)[] = [];
    if (scrollArea) {
      const prevOverflow = scrollArea.style.overflow;
      const prevWidth = scrollArea.style.width;
      scrollArea.style.overflow = "visible";
      scrollArea.style.width = "max-content";
      restore.push(() => {
        scrollArea.style.overflow = prevOverflow;
        scrollArea.style.width = prevWidth;
      });
    }
    stickyEls.forEach((el) => {
      const prevPosition = el.style.position;
      el.style.position = "static";
      restore.push(() => {
        el.style.position = prevPosition;
      });
    });

    try {
      return await html2canvas(target, { backgroundColor: "#ffffff", scale: 2 });
    } finally {
      restore.forEach((fn) => fn());
    }
  }

  async function exportAsImage() {
    if (!exportRef.current) return;
    setExporting("image");
    try {
      const { default: html2canvas } = await import("html2canvas-pro");
      const canvas = await captureSheet(html2canvas);
      triggerDownload(canvas.toDataURL("image/png"), `${sheetFileName()}.png`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't export the sheet as an image");
    } finally {
      setExporting(null);
    }
  }

  async function exportAsPdf() {
    if (!exportRef.current) return;
    setExporting("pdf");
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas-pro"), import("jspdf")]);
      const canvas = await captureSheet(html2canvas);
      const imgData = canvas.toDataURL("image/png");

      // Fit the sheet onto a standard A4 page — landscape for a wide sheet, portrait for a
      // tall/narrow one — scaled to actually fill the page (up OR down, whichever the tighter
      // dimension needs) rather than floating small in the middle, and anchored to the top like
      // a normal printed report instead of vertically centered with dead space above it.
      const margin = 24;
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? "landscape" : "portrait",
        unit: "pt",
        format: "a4",
      });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const availableWidth = pageWidth - margin * 2;
      const availableHeight = pageHeight - margin * 2;
      const scale = Math.min(availableWidth / canvas.width, availableHeight / canvas.height);
      const imgWidth = canvas.width * scale;
      const imgHeight = canvas.height * scale;

      pdf.addImage(imgData, "PNG", (pageWidth - imgWidth) / 2, margin, imgWidth, imgHeight);
      pdf.save(`${sheetFileName()}.pdf`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't export the sheet as a PDF");
    } finally {
      setExporting(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-brand-600" />
          <h2 className="font-semibold text-slate-800">Enter Marks Manually</h2>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Select a department, year and section to load every student in that class, with one column per subject —
          taken from their timetable, or the whole department if the timetable isn't set up yet.
        </p>
      </CardHeader>
      <CardBody className="space-y-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
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
          <Select label="Exam" value={examType} onChange={(e) => setExamType(e.target.value as ExamType)}>
            {EXAM_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
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

        {loadingSheet && <SkeletonTable cols={4} />}

        {!loadingSheet && rows && rows.length === 0 && (
          <EmptyState icon={FileSpreadsheet} title="No students found" description="No students match that department, year and section." />
        )}

        {!loadingSheet && rows && rows.length > 0 && subjects && subjects.length === 0 && (
          <EmptyState
            icon={FileSpreadsheet}
            title="No subjects found"
            description="This department has no subjects yet — add some under Timetable before entering marks."
          />
        )}

        {!loadingSheet && rows && rows.length > 0 && subjects && subjects.length > 0 && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-serif text-sm text-brand-900">
                <span className="font-bold">{rows.length}</span> students &middot; <span className="font-bold">{subjects.length}</span> subjects
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={exportAsPdf} loading={exporting === "pdf"} disabled={exporting === "image"}>
                  <FileDown className="h-3.5 w-3.5" /> Export PDF
                </Button>
                <Button variant="outline" size="sm" onClick={exportAsImage} loading={exporting === "image"} disabled={exporting === "pdf"}>
                  <ImageDown className="h-3.5 w-3.5" /> Export Image
                </Button>
              </div>
            </div>

            <div
              ref={exportRef}
              className="overflow-hidden rounded-2xl border border-gold-200 bg-white shadow-sm"
            >
              <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-brand-950 via-brand-900 to-brand-800 px-5 py-3">
                <div>
                  <p className="font-serif text-sm font-bold text-white">
                    {departments.find((d) => d.id === departmentId)?.name ?? "Class"} &middot;{" "}
                    {CLASS_OPTIONS.find((o) => o.key === classKey)?.label} - {section}
                  </p>
                  <p className="text-xs text-gold-300">
                    {EXAM_OPTIONS.find((o) => o.value === examType)?.label} marks &middot; {academicYear}
                  </p>
                </div>
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gold-400" />
              </div>
              <div className="overflow-x-auto" data-export-scroll>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gold-50">
                      <th className="sticky left-0 z-10 border-b border-gold-200 bg-gold-50 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-brand-800">
                        Student
                      </th>
                      {subjects.map((s) => (
                        <th
                          key={s.id}
                          title={s.name}
                          className="border-b border-gold-200 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-brand-800"
                        >
                          {subjectLabel(s.name)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((r, rowIndex) => (
                      <tr key={r.studentId} className={rowIndex % 2 === 1 ? "bg-slate-50" : "bg-white"}>
                        <td className="sticky left-0 z-10 bg-inherit px-4 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-800 text-[11px] font-bold text-white">
                              {initials(r.fullName)}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-serif font-semibold text-brand-950">{r.fullName}</p>
                              <p className="text-xs text-slate-400">{r.rollNumber}</p>
                            </div>
                          </div>
                        </td>
                        {subjects.map((s, colIndex) => (
                          <td key={s.id} className="px-4 py-2.5">
                            <ScoreInput
                              id={cellId(r.studentId, s.id)}
                              value={r.scores[s.id] ?? null}
                              onChange={(v) => updateScore(r.studentId, s.id, v)}
                              onNavigate={(key) => navigateFrom(rowIndex, colIndex, key)}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <Button onClick={handleSave} loading={saving}>
              <Save className="h-4 w-4" /> Save All ({rows.length} students)
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
