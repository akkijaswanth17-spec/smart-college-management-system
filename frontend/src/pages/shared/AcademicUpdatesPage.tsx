import { useEffect, useState, FormEvent } from "react";
import { motion } from "framer-motion";
import { BookOpen, Plus, Pencil, Trash2, FileText, CalendarDays } from "lucide-react";
import { usePaginatedList } from "../../hooks/usePaginatedList";
import { academicUpdatesService } from "../../services/academicUpdates.service";
import { metaService } from "../../services/meta.service";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input, Select, Textarea } from "../../components/ui/FormField";
import { Modal } from "../../components/ui/Modal";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { EmptyState } from "../../components/ui/EmptyState";
import { Pagination } from "../../components/ui/Pagination";
import { SkeletonList } from "../../components/ui/Skeleton";
import { StaggerContainer, StaggerItem } from "../../components/motion/Stagger";
import { useToast } from "../../context/ToastContext";
import { getErrorMessage } from "../../services/api";
import { formatDate, titleCase } from "../../utils/format";
import { AcademicUpdate, Department } from "../../types";

const CATEGORIES = [
  "EXAM_SCHEDULE",
  "ASSIGNMENT",
  "INTERNAL_ASSESSMENT",
  "ACADEMIC_CALENDAR",
  "DEPARTMENT_ANNOUNCEMENT",
  "IMPORTANT_DEADLINE",
];

const CATEGORY_COLOR: Record<string, string> = {
  EXAM_SCHEDULE: "bg-red-600",
  ASSIGNMENT: "bg-brand-600",
  INTERNAL_ASSESSMENT: "bg-gold-500",
  ACADEMIC_CALENDAR: "bg-emerald-600",
  DEPARTMENT_ANNOUNCEMENT: "bg-slate-500",
  IMPORTANT_DEADLINE: "bg-maroon-600",
};

const CATEGORY_TEXT: Record<string, string> = {
  EXAM_SCHEDULE: "text-red-600",
  ASSIGNMENT: "text-brand-600",
  INTERNAL_ASSESSMENT: "text-gold-600",
  ACADEMIC_CALENDAR: "text-emerald-600",
  DEPARTMENT_ANNOUNCEMENT: "text-slate-500",
  IMPORTANT_DEADLINE: "text-maroon-600",
};

const emptyForm = {
  title: "",
  description: "",
  departmentId: "",
  year: "",
  section: "",
  category: "DEPARTMENT_ANNOUNCEMENT",
  date: new Date().toISOString().slice(0, 10),
};

export function AcademicUpdatesPage({ canManage }: { canManage: boolean }) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [filters, setFilters] = useState<{ category?: string }>({});
  const { items, meta, page, setPage, loading, reload } = usePaginatedList<AcademicUpdate>(
    academicUpdatesService.list,
    filters
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AcademicUpdate | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AcademicUpdate | null>(null);
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    metaService.departments().then(setDepartments).catch(() => setDepartments([]));
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFile(null);
    setModalOpen(true);
  }

  function openEdit(update: AcademicUpdate) {
    setEditing(update);
    setForm({
      title: update.title,
      description: update.description,
      departmentId: update.departmentId ?? "",
      year: update.year?.toString() ?? "",
      section: update.section ?? "",
      category: update.category,
      date: update.date.slice(0, 10),
    });
    setFile(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = new FormData();
      payload.append("title", form.title);
      payload.append("description", form.description);
      payload.append("category", form.category);
      payload.append("date", form.date);
      if (form.departmentId) payload.append("departmentId", form.departmentId);
      if (form.year) payload.append("year", form.year);
      if (form.section) payload.append("section", form.section);
      if (file) payload.append("attachment", file);

      if (editing) {
        await academicUpdatesService.update(editing.id, payload);
        toast.success("Academic update saved");
      } else {
        await academicUpdatesService.create(payload);
        toast.success("Academic update posted");
      }
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
      await academicUpdatesService.remove(deleteTarget.id);
      toast.success("Deleted");
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
          <h1 className="text-xl font-bold text-slate-900">Academic Updates</h1>
          <p className="text-sm text-slate-500">Exam schedules, assignments, deadlines and announcements.</p>
        </div>
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> New Update
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilters({})}
          className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
            !filters.category ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          All
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setFilters({ category: c })}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
              filters.category === c ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {titleCase(c)}
          </button>
        ))}
      </div>

      {loading ? (
        <SkeletonList rows={5} />
      ) : items.length === 0 ? (
        <EmptyState icon={BookOpen} title="No academic updates" description="Nothing posted yet for this filter." />
      ) : (
        <>
          {/* Research-bulletin listing: each update reads like a journal entry, not a table row */}
          <StaggerContainer className="space-y-4">
            {items.map((u, i) => (
              <StaggerItem key={u.id}>
                <motion.article
                  whileHover={{ y: -2 }}
                  className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 pl-7 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className={`absolute inset-y-0 left-0 w-1.5 ${CATEGORY_COLOR[u.category] ?? "bg-slate-500"}`} />
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-widest">
                        <span className={CATEGORY_TEXT[u.category] ?? "text-slate-500"}>{titleCase(u.category)}</span>
                        <span className="text-slate-300">&middot;</span>
                        <span className="text-slate-400">No. {String((page - 1) * meta.pageSize + i + 1).padStart(3, "0")}</span>
                        {u.department && <span className="text-slate-400">&middot; {u.department.code}</span>}
                        {u.year && (
                          <span className="text-slate-400">
                            &middot; Year {u.year}
                            {u.section ? ` - ${u.section}` : ""}
                          </span>
                        )}
                      </div>
                      <h3 className="mt-1.5 font-serif text-lg font-bold text-slate-900">{u.title}</h3>
                      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-600">{u.description}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-slate-100 pt-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5" /> {formatDate(u.date)}
                        </span>
                        {u.attachmentUrl && (
                          <a
                            href={u.attachmentUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 font-medium text-brand-600 hover:text-brand-800"
                          >
                            <FileText className="h-3.5 w-3.5" /> View document
                          </a>
                        )}
                      </div>
                    </div>
                    {canManage && (
                      <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={() => openEdit(u)}
                          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-brand-600"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(u)}
                          className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </motion.article>
              </StaggerItem>
            ))}
          </StaggerContainer>
          <Card>
            <Pagination meta={{ ...meta, page }} onPageChange={setPage} />
          </Card>
        </>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Update" : "New Academic Update"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Textarea
            label="Description"
            required
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {titleCase(c)}
                </option>
              ))}
            </Select>
            <Input label="Date" type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Select
              label="Department (optional)"
              value={form.departmentId}
              onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
            >
              <option value="">All</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code}
                </option>
              ))}
            </Select>
            <Input
              label="Year (optional)"
              type="number"
              min={1}
              max={6}
              value={form.year}
              onChange={(e) => setForm({ ...form, year: e.target.value })}
            />
            <Input
              label="Section (optional)"
              value={form.section}
              onChange={(e) => setForm({ ...form, section: e.target.value.toUpperCase() })}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Attachment (optional)</label>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-brand-700 hover:file:bg-brand-100"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editing ? "Save Changes" : "Post Update"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete update?"
        message={`"${deleteTarget?.title}" will be permanently removed.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
