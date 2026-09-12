import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, GraduationCap, Upload, Download } from "lucide-react";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { StaggerContainer, StaggerItem } from "../../components/motion/Stagger";
import { useToast } from "../../context/ToastContext";
import { getErrorMessage } from "../../services/api";
import { importService } from "../../services/import.service";
import { ImportSummary } from "../../types";

export function ImportCard({
  title,
  icon: Icon,
  columns,
  onImport,
  templateHref,
  accept = ".csv",
}: {
  title: string;
  icon: typeof Users;
  columns: string[];
  onImport: (file: File) => Promise<ImportSummary>;
  templateHref: string;
  accept?: string;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const toast = useToast();

  async function handleUpload() {
    if (!file) return;
    setLoading(true);
    try {
      const result = await onImport(file);
      setSummary(result);
      toast.success(`Imported ${result.successRows} of ${result.totalRows} rows`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-brand-600" />
          <h2 className="font-semibold text-slate-800">{title}</h2>
        </div>
        <a href={templateHref} download className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-800">
          <Download className="h-3.5 w-3.5" /> Template
        </a>
      </CardHeader>
      <CardBody className="space-y-4">
        <p className="text-xs text-slate-500">
          Required columns: <code className="rounded bg-slate-100 px-1.5 py-0.5">{columns.join(", ")}</code>
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            accept={accept}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block flex-1 text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-brand-700 hover:file:bg-brand-100"
          />
          <Button onClick={handleUpload} disabled={!file} loading={loading}>
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

export default function AdminDataImport() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Data Import</h1>
        <p className="text-sm text-slate-500">
          Bulk-import student and faculty accounts from CSV. Temporary passwords are generated automatically, hashed, and
          each account is required to change its password on first login.
        </p>
      </div>

      <StaggerContainer className="grid gap-6 lg:grid-cols-2">
        <StaggerItem>
          <ImportCard
            title="Import Students"
            icon={Users}
            columns={["name", "student_id", "email", "phone", "department", "year", "section"]}
            onImport={importService.students}
            templateHref="/import-templates/students.csv"
          />
        </StaggerItem>
        <StaggerItem>
          <ImportCard
            title="Import Faculty"
            icon={GraduationCap}
            columns={["name", "faculty_id", "email", "phone", "department", "designation"]}
            onImport={importService.faculty}
            templateHref="/import-templates/faculty.csv"
          />
        </StaggerItem>
      </StaggerContainer>
    </div>
  );
}
