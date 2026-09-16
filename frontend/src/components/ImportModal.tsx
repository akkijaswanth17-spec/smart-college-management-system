import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Download } from "lucide-react";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { useToast } from "../context/ToastContext";
import { getErrorMessage } from "../services/api";
import { ImportSummary } from "../types";

/** Bulk CSV import, reused as a modal from the Students and Faculty pages' own toolbars. */
export function ImportModal({
  open,
  onClose,
  title,
  columns,
  onImport,
  templateHref,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  columns: string[];
  onImport: (file: File) => Promise<ImportSummary>;
  templateHref: string;
  /** Called after a successful import so the caller can refresh its list. */
  onImported?: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const toast = useToast();

  function handleClose() {
    setFile(null);
    setSummary(null);
    onClose();
  }

  async function handleUpload() {
    if (!file) return;
    setLoading(true);
    try {
      const result = await onImport(file);
      setSummary(result);
      toast.success(`Imported ${result.successRows} of ${result.totalRows} rows`);
      if (result.successRows > 0) onImported?.();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title={title} maxWidth="max-w-xl">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Required columns: <code className="rounded bg-slate-100 px-1.5 py-0.5">{columns.join(", ")}</code>
          </p>
          <a href={templateHref} download className="flex shrink-0 items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-800">
            <Download className="h-3.5 w-3.5" /> Template
          </a>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            accept=".csv"
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
      </div>
    </Modal>
  );
}
