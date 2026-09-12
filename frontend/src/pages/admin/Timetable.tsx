import { useEffect, useState, FormEvent } from "react";
import { CalendarDays, Table2, Plus, Pencil, Trash2, Upload } from "lucide-react";
import { Link } from "react-router-dom";
import { timetableService } from "../../services/timetable.service";
import { metaService } from "../../services/meta.service";
import { facultyService } from "../../services/faculty.service";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input, Select } from "../../components/ui/FormField";
import { Modal } from "../../components/ui/Modal";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { EmptyState } from "../../components/ui/EmptyState";
import { SkeletonTimetable } from "../../components/ui/Skeleton";
import { WeeklyTimetableGrid } from "../../components/WeeklyTimetableGrid";
import { useToast } from "../../context/ToastContext";
import { getErrorMessage } from "../../services/api";
import { DAYS_OF_WEEK } from "../../utils/format";
import { TimetableEntry, Department, Subject, Room, Block, FacultyProfile } from "../../types";
import { CLASS_OPTIONS, SECTION_OPTIONS, ACADEMIC_YEAR_OPTIONS } from "../../constants/academicClass";

const currentAcademicYear = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
const defaultAcademicYear = ACADEMIC_YEAR_OPTIONS.includes(currentAcademicYear)
  ? currentAcademicYear
  : ACADEMIC_YEAR_OPTIONS[ACADEMIC_YEAR_OPTIONS.length - 1];

const emptyForm = {
  facultyId: "",
  subjectId: "",
  departmentId: "",
  year: CLASS_OPTIONS[0].year,
  section: SECTION_OPTIONS[0],
  day: "MONDAY",
  startTime: "09:00",
  endTime: "10:00",
  roomId: "",
  blockId: "",
  academicYear: defaultAcademicYear,
  allowRoomConflict: false,
};

export default function AdminTimetable() {
  const [view, setView] = useState<"table" | "weekly">("weekly");
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [faculty, setFaculty] = useState<FacultyProfile[]>([]);

  const [filters, setFilters] = useState({ facultyId: "", departmentId: "", day: "" });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TimetableEntry | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<TimetableEntry | null>(null);
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  async function loadEntries() {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {};
      if (filters.facultyId) params.facultyId = filters.facultyId;
      if (filters.departmentId) params.departmentId = filters.departmentId;
      if (filters.day) params.day = filters.day;
      const data = await timetableService.list(params);
      setEntries(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.facultyId, filters.departmentId, filters.day]);

  useEffect(() => {
    Promise.all([metaService.departments(), metaService.subjects(), metaService.blocks(), metaService.rooms(), facultyService.list({ pageSize: 200 })]).then(
      ([d, s, b, r, f]) => {
        setDepartments(d);
        setSubjects(s);
        setBlocks(b);
        setRooms(r);
        setFaculty(f.data);
      }
    );
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(entry: TimetableEntry) {
    setEditing(entry);
    setForm({
      facultyId: entry.facultyId,
      subjectId: entry.subjectId,
      departmentId: entry.departmentId,
      year: entry.year,
      section: entry.section,
      day: entry.day,
      startTime: entry.startTime,
      endTime: entry.endTime,
      roomId: entry.roomId,
      blockId: entry.blockId,
      academicYear: entry.academicYear,
      allowRoomConflict: false,
    });
    setFormError("");
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      if (editing) {
        await timetableService.update(editing.id, form);
        toast.success("Timetable entry updated");
      } else {
        await timetableService.create(form);
        toast.success("Timetable entry created");
      }
      setModalOpen(false);
      loadEntries();
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await timetableService.remove(deleteTarget.id);
      toast.success("Timetable entry deleted");
      setDeleteTarget(null);
      loadEntries();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  const filteredSubjects = form.departmentId ? subjects.filter((s) => s.departmentId === form.departmentId) : subjects;
  const filteredRooms = form.blockId ? rooms.filter((r) => r.blockId === form.blockId) : rooms;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Timetable Management</h1>
          <p className="text-sm text-slate-500">Create and manage class schedules across the college.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/timetable/import">
            <Button variant="outline">
              <Upload className="h-4 w-4" /> Import
            </Button>
          </Link>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> New Entry
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-slate-200 bg-white p-1">
          <button
            onClick={() => setView("weekly")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold ${view === "weekly" ? "bg-brand-600 text-white" : "text-slate-500"}`}
          >
            <CalendarDays className="h-3.5 w-3.5" /> Weekly
          </button>
          <button
            onClick={() => setView("table")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold ${view === "table" ? "bg-brand-600 text-white" : "text-slate-500"}`}
          >
            <Table2 className="h-3.5 w-3.5" /> Table
          </button>
        </div>

        <select
          value={filters.departmentId}
          onChange={(e) => setFilters({ ...filters, departmentId: e.target.value })}
          className="rounded-lg border border-slate-300 px-3 py-2 text-xs"
        >
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.code}
            </option>
          ))}
        </select>
        <select
          value={filters.facultyId}
          onChange={(e) => setFilters({ ...filters, facultyId: e.target.value })}
          className="rounded-lg border border-slate-300 px-3 py-2 text-xs"
        >
          <option value="">All Faculty</option>
          {faculty.map((f) => (
            <option key={f.id} value={f.id}>
              {f.fullName}
            </option>
          ))}
        </select>
        <select
          value={filters.day}
          onChange={(e) => setFilters({ ...filters, day: e.target.value })}
          className="rounded-lg border border-slate-300 px-3 py-2 text-xs"
        >
          <option value="">All Days</option>
          {DAYS_OF_WEEK.map((d) => (
            <option key={d} value={d}>
              {d.charAt(0) + d.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <SkeletonTimetable />
      ) : entries.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No timetable entries" description="Create your first entry or import from a file." />
      ) : view === "weekly" ? (
        <WeeklyTimetableGrid
          entries={entries}
          renderExtra={(entry) => (
            <div className="flex gap-1">
              <button onClick={() => openEdit(entry)} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-brand-600">
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setDeleteTarget(entry)} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Day</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Faculty</th>
                  <th className="px-4 py-3">Year/Section</th>
                  <th className="px-4 py-3">Room</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">{e.day.charAt(0) + e.day.slice(1).toLowerCase()}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {e.startTime} - {e.endTime}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">{e.subject?.name}</td>
                    <td className="px-4 py-3 text-slate-500">{e.faculty?.fullName}</td>
                    <td className="px-4 py-3 text-slate-500">
                      Y{e.year}-{e.section}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {e.room?.number}, {e.block?.name}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <button onClick={() => openEdit(e)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => setDeleteTarget(e)} className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Timetable Entry" : "New Timetable Entry"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{formError}</div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Select label="Faculty" required value={form.facultyId} onChange={(e) => setForm({ ...form, facultyId: e.target.value })}>
              <option value="">Select faculty</option>
              {faculty.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.fullName}
                </option>
              ))}
            </Select>
            <Select label="Department" required value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value, subjectId: "" })}>
              <option value="">Select department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </div>
          <Select label="Subject" required value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })}>
            <option value="">Select subject</option>
            {filteredSubjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          <div className="grid grid-cols-3 gap-4">
            <Select label="Year" required value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}>
              {CLASS_OPTIONS.map((o) => (
                <option key={o.key} value={o.year}>
                  {o.label}
                </option>
              ))}
            </Select>
            <Select label="Section" required value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })}>
              {SECTION_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
            <Select label="Day" required value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })}>
              {DAYS_OF_WEEK.map((d) => (
                <option key={d} value={d}>
                  {d.charAt(0) + d.slice(1).toLowerCase()}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Time" type="time" required value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
            <Input label="End Time" type="time" required value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Block" required value={form.blockId} onChange={(e) => setForm({ ...form, blockId: e.target.value, roomId: "" })}>
              <option value="">Select block</option>
              {blocks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
            <Select label="Room" required value={form.roomId} onChange={(e) => setForm({ ...form, roomId: e.target.value })}>
              <option value="">Select room</option>
              {filteredRooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.number}
                </option>
              ))}
            </Select>
          </div>
          <Select label="Academic Year" required value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })}>
            {ACADEMIC_YEAR_OPTIONS.map((ay) => (
              <option key={ay} value={ay}>
                {ay}
              </option>
            ))}
          </Select>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.allowRoomConflict}
              onChange={(e) => setForm({ ...form, allowRoomConflict: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            Allow this room to be double-booked (faculty conflicts are never allowed)
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editing ? "Save Changes" : "Create Entry"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete timetable entry?"
        message={`${deleteTarget?.subject?.name} on ${deleteTarget?.day} will be removed.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
