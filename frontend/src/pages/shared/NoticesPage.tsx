import { useState, FormEvent } from "react";
import { motion } from "framer-motion";
import { Megaphone, Plus, Pencil, Trash2, Paperclip, Pin } from "lucide-react";
import { usePaginatedList } from "../../hooks/usePaginatedList";
import { noticesService } from "../../services/notices.service";
import { Badge } from "../../components/ui/Badge";
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
import { Notice } from "../../types";

const CATEGORIES = ["GENERAL", "ACADEMIC", "EXAMINATION", "EVENTS", "HOLIDAY", "PLACEMENT", "EMERGENCY"];
const PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"];

const PRIORITY_TONE: Record<string, "slate" | "brand" | "amber" | "red"> = {
  LOW: "slate",
  NORMAL: "brand",
  HIGH: "amber",
  URGENT: "red",
};

const PIN_COLOR: Record<string, string> = {
  LOW: "bg-slate-400",
  NORMAL: "bg-brand-600",
  HIGH: "bg-gold-500",
  URGENT: "bg-red-600",
};

/** Deterministic slight tilt per card so the board doesn't look perfectly gridded. */
function tiltFor(index: number): number {
  const pattern = [-2.5, 1.5, -1, 2, -1.8, 1, 2.5, -2];
  return pattern[index % pattern.length];
}

const emptyForm = {
  title: "",
  description: "",
  category: "GENERAL",
  priority: "NORMAL",
  expiryDate: "",
  isPublished: true,
};

export function NoticesPage({ canManage }: { canManage: boolean }) {
  const [category, setCategory] = useState("");
  const { items, meta, page, setPage, loading, reload } = usePaginatedList<Notice>(
    noticesService.list,
    category ? { category } : {}
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Notice | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Notice | null>(null);
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFile(null);
    setModalOpen(true);
  }

  function openEdit(notice: Notice) {
    setEditing(notice);
    setForm({
      title: notice.title,
      description: notice.description,
      category: notice.category,
      priority: notice.priority,
      expiryDate: notice.expiryDate ? notice.expiryDate.slice(0, 10) : "",
      isPublished: notice.isPublished,
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
      payload.append("priority", form.priority);
      payload.append("isPublished", String(form.isPublished));
      if (form.expiryDate) payload.append("expiryDate", form.expiryDate);
      if (file) payload.append("attachment", file);

      if (editing) {
        await noticesService.update(editing.id, payload);
        toast.success("Notice updated");
      } else {
        await noticesService.create(payload);
        toast.success("Notice created");
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
      await noticesService.remove(deleteTarget.id);
      toast.success("Notice deleted");
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
          <h1 className="text-xl font-bold text-slate-900">Digital Notice Board</h1>
          <p className="text-sm text-slate-500">Official announcements from the college administration.</p>
        </div>
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> New Notice
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setCategory("")}
          className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
            category === "" ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          All
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
              category === c ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {titleCase(c)}
          </button>
        ))}
      </div>

      {loading ? (
        <SkeletonList rows={5} />
      ) : items.length === 0 ? (
        <EmptyState icon={Megaphone} title="No notices found" description="Check back later for updates." />
      ) : (
        <div className="rounded-3xl border-[10px] border-[#6b4423] bg-corkboard p-5 shadow-inner sm:p-8">
          <StaggerContainer className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((notice, i) => (
              <StaggerItem key={notice.id}>
                <motion.div
                  initial={{ rotate: tiltFor(i) }}
                  whileHover={{ rotate: 0, scale: 1.04, zIndex: 10 }}
                  transition={{ type: "spring", stiffness: 260, damping: 18 }}
                  className="group relative rounded-sm bg-[#fffdf6] p-5 pt-7 shadow-[0_10px_20px_rgba(0,0,0,0.35)]"
                >
                  {/* Pin */}
                  <div
                    className={`absolute -top-3 left-1/2 h-6 w-6 -translate-x-1/2 rounded-full shadow-md ring-2 ring-white/80 ${PIN_COLOR[notice.priority]}`}
                  >
                    <Pin className="h-3.5 w-3.5 translate-x-[5px] translate-y-[5px] rotate-45 text-white/90" />
                  </div>

                  {canManage && (
                    <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={() => openEdit(notice)}
                        className="rounded-lg bg-white/80 p-1.5 text-slate-400 shadow-sm hover:text-brand-600"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(notice)}
                        className="rounded-lg bg-white/80 p-1.5 text-slate-400 shadow-sm hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  <div className="mb-2 flex flex-wrap items-center gap-1.5">
                    <Badge tone={PRIORITY_TONE[notice.priority]}>{titleCase(notice.priority)}</Badge>
                    <Badge tone="slate">{titleCase(notice.category)}</Badge>
                    {notice.department && <Badge tone="brand">{notice.department.code}</Badge>}
                    {canManage && !notice.isPublished && <Badge tone="amber">Draft</Badge>}
                  </div>
                  <h3 className="font-serif text-base font-bold text-slate-900">{notice.title}</h3>
                  <p className="mt-1.5 line-clamp-5 whitespace-pre-line text-sm text-slate-600">{notice.description}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-dashed border-slate-200 pt-2 text-xs text-slate-400">
                    <span>{formatDate(notice.publishedDate ?? notice.createdAt)}</span>
                    {notice.expiryDate && <span>Expires {formatDate(notice.expiryDate)}</span>}
                    {notice.attachmentUrl && (
                      <a
                        href={notice.attachmentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 font-medium text-brand-600 hover:text-brand-800"
                      >
                        <Paperclip className="h-3 w-3" /> Attachment
                      </a>
                    )}
                  </div>
                </motion.div>
              </StaggerItem>
            ))}
          </StaggerContainer>
          <div className="mt-6 rounded-xl bg-white/90 p-2">
            <Pagination meta={{ ...meta, page }} onPageChange={setPage} />
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Notice" : "New Notice"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Title"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <Textarea
            label="Description"
            required
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {titleCase(c)}
                </option>
              ))}
            </Select>
            <Select
              label="Priority"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {titleCase(p)}
                </option>
              ))}
            </Select>
          </div>
          <Input
            label="Expiry Date (optional)"
            type="date"
            value={form.expiryDate}
            onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Attachment (optional)</label>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-brand-700 hover:file:bg-brand-100"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.isPublished}
              onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            Publish immediately
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editing ? "Save Changes" : "Create Notice"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete notice?"
        message={`"${deleteTarget?.title}" will be permanently removed.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
