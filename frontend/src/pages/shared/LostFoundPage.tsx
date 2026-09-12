import { useState, FormEvent } from "react";
import { motion } from "framer-motion";
import { Search, Plus, Trash2, MapPin, Phone, Calendar, ImageOff, LogIn } from "lucide-react";
import { usePaginatedList } from "../../hooks/usePaginatedList";
import { lostFoundService } from "../../services/lostFound.service";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Input, Select, Textarea } from "../../components/ui/FormField";
import { Modal } from "../../components/ui/Modal";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { EmptyState } from "../../components/ui/EmptyState";
import { Pagination } from "../../components/ui/Pagination";
import { SkeletonCardGrid } from "../../components/ui/Skeleton";
import { StaggerContainer, StaggerItem } from "../../components/motion/Stagger";
import { LoginMenu } from "../../components/LoginMenu";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { getErrorMessage } from "../../services/api";
import { formatDate, titleCase } from "../../utils/format";
import { LostFoundItem, LostFoundStatus } from "../../types";

const STATUS_TONE: Record<LostFoundStatus, "red" | "green" | "brand" | "slate"> = {
  LOST: "red",
  FOUND: "green",
  CLAIMED: "brand",
  RESOLVED: "slate",
};

/** Stamp color for the diagonal poster ribbon, by type. */
const TYPE_STAMP: Record<"LOST" | "FOUND", string> = {
  LOST: "bg-red-600",
  FOUND: "bg-emerald-600",
};

const emptyForm = {
  itemName: "",
  description: "",
  type: "LOST" as "LOST" | "FOUND",
  location: "",
  date: new Date().toISOString().slice(0, 10),
  contactInfo: "",
};

export function LostFoundPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const { items, meta, page, setPage, loading, reload } = usePaginatedList<LostFoundItem>(lostFoundService.list, {
    search: search || undefined,
    status: statusFilter || undefined,
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LostFoundItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = new FormData();
      Object.entries(form).forEach(([k, v]) => payload.append(k, v));
      if (file) payload.append("image", file);
      await lostFoundService.create(payload);
      toast.success("Item posted");
      setModalOpen(false);
      setForm(emptyForm);
      setFile(null);
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(item: LostFoundItem, status: LostFoundStatus) {
    try {
      await lostFoundService.update(item.id, { status });
      toast.success("Status updated");
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await lostFoundService.remove(deleteTarget.id);
      toast.success("Item removed");
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
          <h1 className="text-xl font-bold text-slate-900">Lost &amp; Found</h1>
          <p className="text-sm text-slate-500">Report lost or found items, or browse what others have posted.</p>
        </div>
        {user ? (
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" /> Report Item
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-slate-400 sm:inline">Sign in to report an item</span>
            <LoginMenu variant="nav" />
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items..."
            className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
        >
          <option value="">All Statuses</option>
          {(["LOST", "FOUND", "CLAIMED", "RESOLVED"] as const).map((s) => (
            <option key={s} value={s}>
              {titleCase(s)}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <SkeletonCardGrid count={6} />
      ) : items.length === 0 ? (
        <EmptyState icon={Search} title="No items found" description="Try adjusting your search or filters." />
      ) : (
        <>
          <StaggerContainer className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => {
              const canManageItem = user?.role === "ADMIN" || item.createdById === user?.id;
              const resolved = item.status === "CLAIMED" || item.status === "RESOLVED";
              return (
                <StaggerItem key={item.id}>
                  <motion.div
                    whileHover={{ y: -4, rotate: -0.5 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className={`relative h-full overflow-hidden rounded-lg border-2 border-dashed bg-[#fdfaf1] shadow-md ${
                      resolved ? "border-slate-300 opacity-70" : item.type === "LOST" ? "border-red-300" : "border-emerald-300"
                    }`}
                  >
                    {/* Diagonal poster stamp */}
                    <div
                      className={`absolute -left-10 top-4 z-10 w-40 -rotate-45 py-1 text-center text-[11px] font-extrabold uppercase tracking-widest text-white shadow ${
                        resolved ? "bg-slate-500" : TYPE_STAMP[item.type]
                      }`}
                    >
                      {resolved ? titleCase(item.status) : item.type}
                    </div>

                    {canManageItem && (
                      <button
                        onClick={() => setDeleteTarget(item)}
                        className="absolute right-2 top-2 z-10 rounded-lg bg-white/80 p-1.5 text-slate-400 shadow-sm hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}

                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.itemName} className="h-40 w-full border-b-2 border-dashed border-slate-200 object-cover" />
                    ) : (
                      <div className="flex h-40 w-full items-center justify-center border-b-2 border-dashed border-slate-200 bg-slate-100 text-slate-300">
                        <ImageOff className="h-10 w-10" />
                      </div>
                    )}

                    <div className="p-4 pt-5">
                      <h3 className="font-serif text-lg font-bold uppercase tracking-wide text-slate-900">{item.itemName}</h3>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-600">{item.description}</p>
                      <div className="mt-3 space-y-1 border-t border-dashed border-slate-200 pt-2 text-xs text-slate-500">
                        <p className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" /> {item.location}
                        </p>
                        <p className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" /> {formatDate(item.date)}
                        </p>
                        <p className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5" /> {item.contactInfo}
                        </p>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <Badge tone={STATUS_TONE[item.status]}>{titleCase(item.status)}</Badge>
                        {user?.role === "ADMIN" && (
                          <select
                            value={item.status}
                            onChange={(e) => updateStatus(item, e.target.value as LostFoundStatus)}
                            className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
                          >
                            {(["LOST", "FOUND", "CLAIMED", "RESOLVED"] as const).map((s) => (
                              <option key={s} value={s}>
                                {titleCase(s)}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </StaggerItem>
              );
            })}
          </StaggerContainer>
          <Card>
            <Pagination meta={{ ...meta, page }} onPageChange={setPage} />
          </Card>
        </>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Report Lost / Found Item">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as "LOST" | "FOUND" })}>
              <option value="LOST">Lost</option>
              <option value="FOUND">Found</option>
            </Select>
            <Input
              label="Date"
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </div>
          <Input
            label="Item Name"
            required
            value={form.itemName}
            onChange={(e) => setForm({ ...form, itemName: e.target.value })}
          />
          <Textarea
            label="Description"
            required
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <Input
            label="Location"
            required
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />
          <Input
            label="Contact Information"
            required
            value={form.contactInfo}
            onChange={(e) => setForm({ ...form, contactInfo: e.target.value })}
            placeholder="Phone number or email"
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Photo (optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-brand-700 hover:file:bg-brand-100"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Submit
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Remove this post?"
        message={`"${deleteTarget?.itemName}" will be permanently removed.`}
        confirmLabel="Remove"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
