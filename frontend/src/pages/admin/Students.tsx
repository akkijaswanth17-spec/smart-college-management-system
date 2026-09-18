import { useEffect, useState, FormEvent } from "react";
import { motion } from "framer-motion";
import { Search, Users, Pencil, Plus, Upload, Copy, Check, Trash2, IdCard } from "lucide-react";
import { usePaginatedList } from "../../hooks/usePaginatedList";
import { studentsService } from "../../services/students.service";
import { importService } from "../../services/import.service";
import { ImportModal } from "../../components/ImportModal";
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
import { StudentProfile } from "../../types";
import { CLASS_OPTIONS, SECTION_OPTIONS, classKeyFor } from "../../constants/academicClass";
import { useDepartmentOptions } from "../../hooks/useDepartmentOptions";

const emptyCreateForm = {
  fullName: "",
  studentId: "",
  email: "",
  phone: "",
  departmentId: "",
  classKey: CLASS_OPTIONS[0].key,
  section: SECTION_OPTIONS[0],
};

export default function AdminStudents() {
  const [search, setSearch] = useState("");
  const departments = useDepartmentOptions();
  // Every match loads in one page — see listStudents on the backend for the raised cap.
  const { items, loading, reload } = usePaginatedList<StudentProfile>(studentsService.list, {
    search: search || undefined,
    pageSize: 1000,
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [manualPassword, setManualPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [credentialResult, setCredentialResult] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const [editing, setEditing] = useState<StudentProfile | null>(null);
  const [form, setForm] = useState({
    fullName: "",
    studentId: "",
    phone: "",
    departmentId: "",
    classKey: CLASS_OPTIONS[0].key,
    section: SECTION_OPTIONS[0],
  });
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<StudentProfile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const { classKey, ...rest } = createForm;
      const cls = CLASS_OPTIONS.find((o) => o.key === classKey)!;
      const base = { ...rest, year: cls.year, semester: cls.semester };
      const payload = manualPassword && password ? { ...base, password } : base;
      const result = await studentsService.create(payload);
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

  function openEdit(s: StudentProfile) {
    setEditing(s);
    setForm({
      fullName: s.fullName,
      studentId: s.studentId,
      phone: s.phone,
      departmentId: s.departmentId,
      classKey: classKeyFor(s.year, s.semester),
      section: s.section,
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      const { classKey, ...rest } = form;
      const cls = CLASS_OPTIONS.find((o) => o.key === classKey)!;
      await studentsService.update(editing.id, { ...rest, year: cls.year, semester: cls.semester });
      toast.success("Student updated");
      setEditing(null);
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
      await studentsService.remove(deleteTarget.id);
      toast.success("Student account deleted");
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
          <h1 className="text-xl font-bold text-slate-900">Student Management</h1>
          <p className="text-sm text-slate-500">Create and manage student accounts. Students do not self-register.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" /> Import Students
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Add Student
          </Button>
        </div>
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
        <EmptyState icon={Users} title="No students found" action={<Button onClick={() => setCreateOpen(true)}>Add Student</Button>} />
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((s, i) => {
              const active = s.user?.isActive !== false;
              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: i * 0.04 }}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex items-center gap-2 bg-gradient-to-r from-brand-800 to-brand-600 px-4 py-2 text-white">
                    <IdCard className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Student ID</span>
                    <span className={`ml-auto h-2 w-2 rounded-full ${active ? "bg-emerald-400" : "bg-red-400"}`} />
                  </div>
                  <div className="flex items-center gap-3 p-4">
                    <PersonAvatar tone="brand" src={s.user?.avatarUrl} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-900">{s.fullName}</p>
                      <p className="font-mono text-xs text-slate-500">{s.studentId}</p>
                      <p className="truncate text-xs text-slate-400">
                        {s.department?.code} &middot; {CLASS_OPTIONS.find((o) => o.key === classKeyFor(s.year, s.semester))?.label} - {s.section}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-dashed border-slate-200 px-4 py-2.5">
                    <Badge tone={active ? "green" : "red"}>{active ? "Active" : "Inactive"}</Badge>
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEdit(s)}
                        title="Edit"
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(s)}
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
        </>
      )}

      {/* Create Student */}
      <Modal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setManualPassword(false);
          setPassword("");
        }}
        title="Add Student"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Full Name"
            required
            value={createForm.fullName}
            onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Student ID / Roll Number"
              required
              value={createForm.studentId}
              onChange={(e) => setCreateForm({ ...createForm, studentId: e.target.value })}
            />
            <Input
              label="Phone"
              required
              value={createForm.phone}
              onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
            />
          </div>
          <Input
            label="Email"
            type="email"
            required
            value={createForm.email}
            onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
          />
          <div className="grid grid-cols-3 gap-4">
            <Select
              label="Department"
              required
              value={createForm.departmentId}
              onChange={(e) => setCreateForm({ ...createForm, departmentId: e.target.value })}
              className="col-span-1"
            >
              <option value="">Select</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code}
                </option>
              ))}
            </Select>
            <Select
              label="Year"
              required
              value={createForm.classKey}
              onChange={(e) => setCreateForm({ ...createForm, classKey: e.target.value })}
            >
              {CLASS_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </Select>
            <Select
              label="Section"
              required
              value={createForm.section}
              onChange={(e) => setCreateForm({ ...createForm, section: e.target.value })}
            >
              {SECTION_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
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
              Create Student
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Student */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Student">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Full Name" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Student ID / Roll Number"
              required
              value={form.studentId}
              onChange={(e) => setForm({ ...form, studentId: e.target.value })}
            />
            <Input label="Phone" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Select
              label="Department"
              value={form.departmentId}
              onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
              className="col-span-1"
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code}
                </option>
              ))}
            </Select>
            <Select label="Year" value={form.classKey} onChange={(e) => setForm({ ...form, classKey: e.target.value })}>
              {CLASS_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </Select>
            <Select label="Section" value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })}>
              {SECTION_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
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
      <Modal open={!!credentialResult} onClose={() => setCredentialResult(null)} title="Student Credentials" maxWidth="max-w-sm">
        <p className="text-sm text-slate-600">
          Share these credentials securely with the student. They will be required to change their password on first
          login. This password will not be shown again.
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
        open={!!deleteTarget}
        title="Delete student account?"
        message={`${deleteTarget?.fullName} will no longer be able to log in. Their notices, results and academic history are preserved.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import Students"
        columns={["name", "student_id", "email", "phone", "department", "year", "section"]}
        onImport={importService.students}
        templateHref="/import-templates/students.csv"
        onImported={reload}
      />
    </div>
  );
}
