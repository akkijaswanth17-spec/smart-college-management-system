import { useEffect, useState, FormEvent } from "react";
import { motion } from "framer-motion";
import { Building2, Plus, Pencil, KeyRound, Power, Copy, Check, Trash2 } from "lucide-react";
import { branchAdminService } from "../../services/branchAdmin.service";
import { metaService } from "../../services/meta.service";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Input, Select } from "../../components/ui/FormField";
import { Modal } from "../../components/ui/Modal";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { EmptyState } from "../../components/ui/EmptyState";
import { SkeletonCardGrid } from "../../components/ui/Skeleton";
import { useToast } from "../../context/ToastContext";
import { getErrorMessage } from "../../services/api";
import { PersonAvatar } from "../../components/ui/Avatar";
import { PasswordOptionField } from "../../components/PasswordOptionField";
import { BranchAdminProfile, Department } from "../../types";

const emptyCreateForm = { fullName: "", branchId: "", email: "", phone: "", departmentId: "" };

export default function AdminBranchAccounts() {
  const [items, setItems] = useState<BranchAdminProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<Department[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [manualPassword, setManualPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [credentialResult, setCredentialResult] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const [editing, setEditing] = useState<BranchAdminProfile | null>(null);
  const [editForm, setEditForm] = useState({ fullName: "", branchId: "", phone: "" });
  const [saving, setSaving] = useState(false);

  const [deactivateTarget, setDeactivateTarget] = useState<BranchAdminProfile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BranchAdminProfile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const toast = useToast();

  function reload() {
    setLoading(true);
    branchAdminService
      .list()
      .then(setItems)
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    reload();
    metaService.departments().then(setDepartments).catch(() => setDepartments([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const payload = manualPassword && password ? { ...createForm, password } : createForm;
      const result = await branchAdminService.create(payload);
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

  function openEdit(b: BranchAdminProfile) {
    setEditing(b);
    setEditForm({ fullName: b.fullName, branchId: b.branchId, phone: b.phone });
  }

  async function handleEditSubmit(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      await branchAdminService.update(editing.id, editForm);
      toast.success("Branch account updated");
      setEditing(null);
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(b: BranchAdminProfile) {
    const active = b.user?.isActive ?? true;
    setBusyId(b.id);
    try {
      await branchAdminService.setActive(b.id, !active);
      toast.success(active ? "Branch account deactivated" : "Branch account activated");
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusyId(null);
      setDeactivateTarget(null);
    }
  }

  async function handleResetPassword(b: BranchAdminProfile) {
    setBusyId(b.id);
    try {
      const temp = await branchAdminService.resetPassword(b.id);
      setCredentialResult({ email: b.user?.email ?? "", password: temp });
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
      await branchAdminService.remove(deleteTarget.id);
      toast.success("Branch account deleted");
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
          <h1 className="text-xl font-bold text-slate-900">Branch Accounts</h1>
          <p className="text-sm text-slate-500">
            One login per department — manages that department's own students, faculty, timetable and marks only.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Add Branch Account
        </Button>
      </div>

      {loading ? (
        <SkeletonCardGrid count={6} />
      ) : items.length === 0 ? (
        <EmptyState icon={Building2} title="No branch accounts yet" description="Create one per department below." />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((b, i) => {
            const active = b.user?.isActive ?? true;
            return (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.04 }}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-center gap-2 bg-gradient-to-r from-brand-800 to-brand-600 px-4 py-2 text-white">
                  <Building2 className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Branch Admin</span>
                  <span className={`ml-auto h-2 w-2 rounded-full ${active ? "bg-emerald-400" : "bg-red-400"}`} />
                </div>
                <div className="flex items-center gap-3 p-4">
                  <PersonAvatar tone="brand" src={b.user?.avatarUrl} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900">{b.fullName}</p>
                    <p className="truncate font-mono text-xs text-slate-500">{b.branchId}</p>
                    <p className="truncate text-xs text-slate-400">{b.user?.email}</p>
                    <p className="truncate text-xs text-slate-400">
                      {b.department?.name} &middot; {b.department?.code}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-dashed border-slate-200 px-4 py-2.5">
                  <Badge tone={active ? "green" : "red"}>{active ? "ACTIVE" : "INACTIVE"}</Badge>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEdit(b)}
                      title="Edit"
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleResetPassword(b)}
                      disabled={busyId === b.id}
                      title="Reset Password"
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600"
                    >
                      <KeyRound className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeactivateTarget(b)}
                      disabled={busyId === b.id}
                      title={active ? "Deactivate" : "Activate"}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-maroon-600"
                    >
                      <Power className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(b)}
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
      )}

      {/* Create Branch Account */}
      <Modal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setManualPassword(false);
          setPassword("");
        }}
        title="Add Branch Account"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Full Name" required value={createForm.fullName} onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })} />
            <Input label="Branch ID" required value={createForm.branchId} onChange={(e) => setCreateForm({ ...createForm, branchId: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Email" type="email" required value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} />
            <Input label="Phone" required value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })} />
          </div>
          <Select label="Department / Branch" required value={createForm.departmentId} onChange={(e) => setCreateForm({ ...createForm, departmentId: e.target.value })}>
            <option value="">Select department</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.code})
              </option>
            ))}
          </Select>
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
              Create Account
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Branch Account */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Branch Account">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <Input label="Full Name" required value={editForm.fullName} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Branch ID" required value={editForm.branchId} onChange={(e) => setEditForm({ ...editForm, branchId: e.target.value })} />
            <Input label="Phone" required value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
          </div>
          <p className="text-xs text-slate-400">
            Department: {editing?.department?.name} — to move this account to a different department, delete it and
            create a new one there.
          </p>
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
      <Modal open={!!credentialResult} onClose={() => setCredentialResult(null)} title="Branch Account Credentials" maxWidth="max-w-sm">
        <p className="text-sm text-slate-600">
          Share these credentials securely with the branch coordinator. They will be required to change their password
          on first login. This password will not be shown again.
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
        title={(deactivateTarget?.user?.isActive ?? true) ? "Deactivate branch account?" : "Activate branch account?"}
        message={
          (deactivateTarget?.user?.isActive ?? true)
            ? `${deactivateTarget?.fullName} will no longer be able to log in.`
            : `${deactivateTarget?.fullName} will regain access to their account.`
        }
        confirmLabel={(deactivateTarget?.user?.isActive ?? true) ? "Deactivate" : "Activate"}
        danger={deactivateTarget?.user?.isActive ?? true}
        loading={busyId === deactivateTarget?.id}
        onConfirm={() => deactivateTarget && toggleActive(deactivateTarget)}
        onCancel={() => setDeactivateTarget(null)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete branch account?"
        message={`${deleteTarget?.fullName} will no longer be able to log in. Their department's students, faculty and timetable data are unaffected.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
