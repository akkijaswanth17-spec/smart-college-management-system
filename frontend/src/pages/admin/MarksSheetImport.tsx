import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileSpreadsheet, Upload } from "lucide-react";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Select } from "../../components/ui/FormField";
import { metaService } from "../../services/meta.service";
import { marksService } from "../../services/marks.service";
import { useToast } from "../../context/ToastContext";
import { getErrorMessage } from "../../services/api";
import { Department, ExamType, ImportSummary } from "../../types";
import { CLASS_OPTIONS, SECTION_OPTIONS, ACADEMIC_YEAR_OPTIONS } from "../../constants/academicClass";

const currentAcademicYear = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

const EXAM_OPTIONS: { value: ExamType; label: string }[] = [
  { value: "mid1", label: "Mid 1" },
  { value: "mid2", label: "Mid 2" },
  { value: "semester", label: "Semester" },
];

/**
 * Imports a real class marks sheet exactly as the college produces it — S.No,
 * PIN Number, Name, then one column per subject (AP, BDCC, IME, ...) — instead
 * of requiring it be reshaped into a roll_number/subject/mid1/mid2/sem file.
 */
export function MarksSheetImport() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentId, setDepartmentId] = useState("");
  const [classKey, setClassKey] = useState(CLASS_OPTIONS[0].key);
  const year = CLASS_OPTIONS.find((o) => o.key === classKey)!.year;
  const [section, setSection] = useState(SECTION_OPTIONS[0]);
  const [examType, setExamType] = useState<ExamType>("mid1");
  const [academicYear, setAcademicYear] = useState(
    ACADEMIC_YEAR_OPTIONS.includes(currentAcademicYear) ? currentAcademicYear : ACADEMIC_YEAR_OPTIONS[ACADEMIC_YEAR_OPTIONS.length - 1]
  );
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const toast = useToast();

  useEffect(() => {
    metaService.departments().then(setDepartments);
  }, []);

  const canImport = departmentId && section.trim() && file;

  async function handleImport() {
    if (!canImport || !file) return;
    setLoading(true);
    setSummary(null);
    try {
      const result = await marksService.importWide(file, {
        departmentId,
        year,
        section: section.trim().toUpperCase(),
        examType,
        academicYear,
      });
      setSummary(result);
      toast.success(`Imported ${result.successRows} of ${result.totalRows} students`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-brand-600" />
          <h2 className="font-semibold text-slate-800">Import Marks Sheet</h2>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Upload the class's real marks sheet as-is — S.No, PIN Number, Name, then one column per subject (e.g. AP,
          BDCC, IME). Choose which exam these marks are for below; the sheet itself doesn't need that column.
        </p>
      </CardHeader>
      <CardBody className="space-y-4">
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

        <div className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block flex-1 text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-brand-700 hover:file:bg-brand-100"
          />
          <Button onClick={handleImport} disabled={!canImport} loading={loading}>
            <Upload className="h-4 w-4" /> Import
          </Button>
        </div>

        <AnimatePresence>
          {summary && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -8 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="overflow-hidden rounded-lg border border-slate-200 p-4 text-sm"
            >
              <p>
                <span className="font-semibold text-emerald-700">{summary.successRows} succeeded</span>
                {summary.failedRows > 0 && <span className="ml-3 font-semibold text-red-600">{summary.failedRows} failed</span>}
                <span className="ml-3 text-slate-400">of {summary.totalRows} rows</span>
              </p>
              {summary.errors.length > 0 && (
                <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs text-red-600">
                  {summary.errors.map((e, i) => (
                    <li key={i}>
                      Row {e.row}: {e.message}
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </CardBody>
    </Card>
  );
}

export default MarksSheetImport;
