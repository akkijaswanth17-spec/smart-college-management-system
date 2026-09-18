import { useEffect, useState, FormEvent } from "react";
import { FolderOpen, Plus, Trash2, Download, FileText } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Input, Select } from "../../components/ui/FormField";
import { Modal } from "../../components/ui/Modal";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { EmptyState } from "../../components/ui/EmptyState";
import { SkeletonList } from "../../components/ui/Skeleton";
import { StaggerContainer, StaggerItem } from "../../components/motion/Stagger";
import { useToast } from "../../context/ToastContext";
import { getErrorMessage } from "../../services/api";
import { formatDate, titleCase } from "../../utils/format";
import { studyMaterialsService } from "../../services/studyMaterials.service";
import { StudyMaterial, StudyMaterialType } from "../../types";

const TYPES: { value: StudyMaterialType; label: string }[] = [
  { value: "ASSIGNMENT", label: "Assignments" },
  { value: "NOTES", label: "Notes" },
  { value: "QUESTION_BANK", label: "Question Bank" },
];

const TYPE_TONE: Record<StudyMaterialType, "brand" | "gold" | "green"> = {
  ASSIGNMENT: "brand",
  NOTES: "gold",
  QUESTION_BANK: "green",
};

const emptyForm = { title: "", type: "ASSIGNMENT" as StudyMaterialType };

export function StudyMaterialsPage({ canManage }: { canManage: boolean }) {
  const [type, setType] = useState<StudyMaterialType | "">("");
  const [items, setItems] = useState<StudyMaterial[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StudyMaterial | null>(null);
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  async function reload() {
    setLoading(true);
    try {
      const data = await studyMaterialsService.list(type ? { type } : undefined);
      setItems(data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  function openCreate() {
    setForm(emptyForm);
    setFile(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) return;
    setSaving(true);
    try {
      await studyMaterialsService.upload({ title: form.title, type: form.type, file });
      toast.success("Material uploaded");
      setModalOpen(false);
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await studyMaterialsService.remove(deleteTarget.id);
      toast.success("Material removed");
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Study Materials</h1>
          <p className="text-sm text-slate-500">
            {canManage
              ? "Upload assignments, notes and question banks for your department's students."
              : "Assignments, notes and question banks shared by your department."}
          </p>
        </div>
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Upload Material
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setType("")}
          className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
            type === "" ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          All
        </button>
        {TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => setType(t.value)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
              type === t.value ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <SkeletonList rows={5} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No materials yet"
          description={canManage ? "Upload your first assignment, notes or question bank above." : "Check back later for materials from your department."}
        />
      ) : (
        <StaggerContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((m) => (
            <StaggerItem key={m.id}>
              <Card className="flex h-full flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                      <FileText className="h-4.5 w-4.5" />
                    </span>
                    <Badge tone={TYPE_TONE[m.type]}>{titleCase(m.type.replace("_", " "))}</Badge>
                  </div>
                  {canManage && (
                    <button
                      onClick={() => setDeleteTarget(m)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      aria-label="Delete material"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-800" title={m.title}>
                    {m.title}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-slate-400" title={m.fileName}>
                    {m.fileName}
                  </p>
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-xs text-slate-400">{formatDate(m.createdAt)}</span>
                  <a
                    href={m.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    download
                    className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-800"
                  >
                    <Download className="h-3.5 w-3.5" /> Download
                  </a>
                </div>
              </Card>
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Upload Material">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Select label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as StudyMaterialType })}>
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">File</label>
            <input
              type="file"
              required
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.txt,image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-brand-700 hover:file:bg-brand-100"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving} disabled={!file}>
              Upload
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete material?"
        message={`"${deleteTarget?.title}" will be permanently removed.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
