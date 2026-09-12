import { useEffect, useState, FormEvent } from "react";
import { motion } from "framer-motion";
import { Search, GraduationCap, Plus, Pencil, KeyRound, Power, Copy, Check, Trash2, IdCard } from "lucide-react";
import { usePaginatedList } from "../../hooks/usePaginatedList";
import { facultyService } from "../../services/faculty.service";
import { metaService } from "../../services/meta.service";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Input, Select } from "../../components/ui/FormField";
import { Modal } from "../../components/ui/Modal";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { EmptyState } from "../../components/ui/EmptyState";
import { Pagination } from "../../components/ui/Pagination";
import { SkeletonCardGrid } from "../../components/ui/Skeleton";
import { useToast } from "../../context/ToastContext";
import { getErrorMessage } from "../../services/api";
import { PersonAvatar } from "../../components/ui/Avatar";
import { PasswordOptionField } from "../../components/PasswordOptionField";
import { FacultyProfile, Department } from "../../types";

const emptyCreateForm = { fullName: "", title: "", facultyId: "", email: "", phone: "", departmentId: "", designation: "" };

export default function AdminFaculty() {
  const [search, setSearch] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const { items, meta, page, setPage, loading, reload } = usePaginatedList<FacultyProfile>(facultyService.list, {
    search: search || undefined,
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [manualPassword, setManualPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [credentialResult, setCredentialResult] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const [editing, setEditing] = useState<FacultyProfile | null>(null);
  const [editForm, setEditForm] = useState({ fullName: "", title: "", facultyId: "", phone: "", departmentId: "", designation: "" });
  const [saving, setSaving] = useState(false);

  const [deactivateTarget, setDeactivateTarget] = useState<FacultyProfile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FacultyProfile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const toast = useToast();

  useEffect(() => {
    metaService.departments().then(setDepartments).catch(() => setDepartments([]));
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const base = { ...createForm, title: createForm.title || undefined };
      const payload = manualPassword && password ? { ...base, password } : base;
      const result = await facultyService.create(payload);
      setCredentialResult({ email: createForm.email, password: result.tempPassword });
      setCreateForm(emptyCreateForm);
      setManualPassword(false);
      setPassword("");
      setCreateOpen(false);
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setCreating(false);
    }
  }

  function openEdit(f: FacultyProfile) {
    setEditing(f);
    setEditForm({
      fullName: f.fullName,
      title: f.title ?? "",
      facultyId: f.facultyId,
      phone: f.phone,
      departmentId: f.departmentId,
      designation: f.designation,
    });
  }

  async function handleEditSubmit(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      await facultyService.update(editing.id, { ...editForm, title: editForm.title || null });
      toast.success("Faculty updated");
      setEditing(null);
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(f: FacultyProfile) {
    setBusyId(f.id);
    try {
      await facultyService.setActive(f.id, f.status !== "ACTIVE");
      toast.success(f.status === "ACTIVE" ? "Faculty deactivated" : "Faculty activated");
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusyId(null);
      setDeactivateTarget(null);
    }
  }

  async function handleResetPassword(f: FacultyProfile) {
    setBusyId(f.id);
    try {
      const temp = await facultyService.resetPassword(f.id);
      setCredentialResult({ email: f.user?.email ?? "", password: temp });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await facultyService.remove(deleteTarget.id);
      toast.success("Faculty account deleted");
      setDeleteTarget(null);
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  function copyCredentials() {
    if (!credentialResult) return;
    navigator.clipboard.writeText(`Email: ${credentialResult.email}\nTemporary Password: ${credentialResult.password}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Faculty Management</h1>
          <p className="text-sm text-slate-500">Create and manage faculty accounts.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Add Faculty
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, ID or email..."
          className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
      </div>

      {loading ? (
        <SkeletonCardGrid count={6} />
      ) : items.length === 0 ? (
        <EmptyState icon={GraduationCap} title="No faculty found" />
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((f, i) => {
              const active = f.status === "ACTIVE";
              return (
                <motion.div
                  key={f.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: i * 0.04 }}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex items-center gap-2 bg-gradient-to-r from-gold-600 to-gold-400 px-4 py-2 text-brand-900">
                    <IdCard className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Faculty ID</span>
                    <span className={`ml-auto h-2 w-2 rounded-full ${active ? "bg-emerald-600" : "bg-red-600"}`} />
                  </div>
                  <div className="flex items-center gap-3 p-4">
                    <PersonAvatar tone="gold" src={f.user?.avatarUrl} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-900">{f.fullName}</p>
                      <p className="font-mono text-xs text-slate-500">{f.facultyId}</p>
                      <p className="truncate text-xs text-slate-400">
                        {f.department?.code} &middot; {f.designation}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-dashed border-slate-200 px-4 py-2.5">
                    <Badge tone={active ? "green" : "red"}>{f.status}</Badge>
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEdit(f)}
                        title="Edit"
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleResetPassword(f)}
                        disabled={busyId === f.id}
                        title="Reset Password"
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600"
                      >
                        <KeyRound className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeactivateTarget(f)}
                        disabled={busyId === f.id}
                        title={active ? "Deactivate" : "Activate"}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-maroon-600"
                      >
                        <Power className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(f)}
                        title="Delete"
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
          <Card>
            <Pagination meta={{ ...meta, page }} onPageChange={setPage} />
          </Card>
        </>
      )}

      {/* Create Faculty */}
      <Modal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setManualPassword(false);
          setPassword("");
        }}
        title="Add Faculty"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <Input label="Full Name" required value={createForm.fullName} onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })} />
            </div>
            <Input
              label="Title"
              value={createForm.title}
              onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
              placeholder="Mr., Dr..."
              hint="Optional"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Faculty ID" required value={createForm.facultyId} onChange={(e) => setCreateForm({ ...createForm, facultyId: e.target.value })} />
            <Input label="Phone" required value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })} />
          </div>
          <Input label="Email" type="email" required value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Department" required value={createForm.departmentId} onChange={(e) => setCreateForm({ ...createForm, departmentId: e.target.value })}>
              <option value="">Select department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
            <Input label="Designation" required value={createForm.designation} onChange={(e) => setCreateForm({ ...createForm, designation: e.target.value })} placeholder="Assistant Professor" />
          </div>
          <PasswordOptionField value={password} onChange={setPassword} manual={manualPassword} onManualChange={setManualPassword} />
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCreateOpen(false);
                setManualPassword(false);
                setPassword("");
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={creating}>
              Create Faculty
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Faculty */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Faculty">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <Input label="Full Name" required value={editForm.fullName} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} />
            </div>
            <Input
              label="Title"
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              placeholder="Mr., Dr..."
              hint="Optional"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Faculty ID" required value={editForm.facultyId} onChange={(e) => setEditForm({ ...editForm, facultyId: e.target.value })} />
            <Input label="Phone" required value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Department" value={editForm.departmentId} onChange={(e) => setEditForm({ ...editForm, departmentId: e.target.value })}>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
            <Input label="Designation" value={editForm.designation} onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Credentials reveal (shown once) */}
      <Modal open={!!credentialResult} onClose={() => setCredentialResult(null)} title="Faculty Credentials" maxWidth="max-w-sm">
        <p className="text-sm text-slate-600">
          Share these credentials securely with the faculty member. They will be required to change their password on
          first login. This password will not be shown again.
        </p>
        <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-4 font-mono text-sm">
          <p>
            <span className="text-slate-400">Email:</span> {credentialResult?.email}
          </p>
          <p>
            <span className="text-slate-400">Password:</span> {credentialResult?.password}
          </p>
        </div>
        <Button variant="outline" className="mt-4 w-full" onClick={copyCredentials}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copied" : "Copy to clipboard"}
        </Button>
      </Modal>

      <ConfirmDialog
        open={!!deactivateTarget}
        title={deactivateTarget?.status === "ACTIVE" ? "Deactivate faculty?" : "Activate faculty?"}
        message={
          deactivateTarget?.status === "ACTIVE"
            ? `${deactivateTarget?.fullName} will no longer be able to log in.`
            : `${deactivateTarget?.fullName} will regain access to their account.`
        }
        confirmLabel={deactivateTarget?.status === "ACTIVE" ? "Deactivate" : "Activate"}
        danger={deactivateTarget?.status === "ACTIVE"}
        loading={busyId === deactivateTarget?.id}
        onConfirm={() => deactivateTarget && toggleActive(deactivateTarget)}
        onCancel={() => setDeactivateTarget(null)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete faculty account?"
        message={`${deleteTarget?.fullName} will no longer be able to log in. Their notices, timetable history and audit records are preserved.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
