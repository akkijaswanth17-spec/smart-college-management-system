import { useEffect, useState } from "react";
import { Image as ImageIcon, FileSpreadsheet, Upload, Trash2, CheckCircle2, Plus, Download } from "lucide-react";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input, Select } from "../../components/ui/FormField";
import { PageSpinner } from "../../components/ui/Spinner";
import { useToast } from "../../context/ToastContext";
import { getErrorMessage } from "../../services/api";
import { importService } from "../../services/import.service";
import { metaService } from "../../services/meta.service";
import { facultyService } from "../../services/faculty.service";
import { DAYS_OF_WEEK } from "../../utils/format";
import { Department, Subject, Room, Block, FacultyProfile, DayOfWeek, ImportSummary } from "../../types";

const currentAcademicYear = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

interface EditableRow {
  facultyId: string;
  subjectId: string;
  departmentId: string;
  year: number;
  section: string;
  day: DayOfWeek;
  startTime: string;
  endTime: string;
  roomId: string;
  blockId: string;
  academicYear: string;
  rawLine?: string;
}

function blankRow(overrides: Partial<EditableRow> = {}): EditableRow {
  return {
    facultyId: "",
    subjectId: "",
    departmentId: "",
    year: 1,
    section: "",
    day: "MONDAY",
    startTime: "09:00",
    endTime: "10:00",
    roomId: "",
    blockId: "",
    academicYear: currentAcademicYear,
    ...overrides,
  };
}

export default function AdminTimetableImport() {
  const [tab, setTab] = useState<"image" | "csv">("image");
  const toast = useToast();

  // Lookups
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [faculty, setFaculty] = useState<FacultyProfile[]>([]);

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

  // ---- Image OCR flow ----
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [rawText, setRawText] = useState("");
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [confirmResult, setConfirmResult] = useState<{ created: number; failed: number } | null>(null);

  async function handleImageUpload() {
    if (!imageFile) return;
    setUploading(true);
    try {
      const result = await importService.timetableImage(imageFile);
      setImagePreview(result.imageUrl);
      setRawText(result.rawText);
      setRows(
        result.rows.map((r: any) =>
          blankRow({
            day: (r.day as DayOfWeek) ?? "MONDAY",
            startTime: r.startTime ?? "09:00",
            endTime: r.endTime ?? "10:00",
            rawLine: r.rawLine,
          })
        )
      );
      setConfirmResult(null);
      if (result.rows.length === 0) {
        toast.error("No schedule-like lines were detected. You can still add rows manually below.");
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  function updateRow(index: number, patch: Partial<EditableRow>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleConfirm() {
    const incomplete = rows.some((r) => !r.facultyId || !r.subjectId || !r.departmentId || !r.roomId || !r.blockId || !r.section);
    if (incomplete) {
      toast.error("Please complete faculty, subject, department, room, block and section for every row.");
      return;
    }
    setConfirming(true);
    try {
      const payload = rows.map(({ rawLine, ...r }) => r);
      const result = await importService.confirmTimetableImage(payload);
      setConfirmResult(result);
      toast.success(`${result.created} entries saved to the timetable`);
      setRows([]);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setConfirming(false);
    }
  }

  // ---- CSV flow ----
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvSummary, setCsvSummary] = useState<ImportSummary | null>(null);

  async function handleCsvUpload() {
    if (!csvFile) return;
    setCsvUploading(true);
    try {
      const result = await importService.timetableCsv(csvFile);
      setCsvSummary(result);
      toast.success(`Imported ${result.successRows} of ${result.totalRows} rows`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setCsvUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Timetable Import</h1>
        <p className="text-sm text-slate-500">Upload a timetable photo or a CSV file — nothing is saved until you confirm.</p>
      </div>

      <div className="flex rounded-lg border border-slate-200 bg-white p-1 w-fit">
        <button
          onClick={() => setTab("image")}
          className={`flex items-center gap-1.5 rounded-md px-3.5 py-2 text-sm font-semibold ${tab === "image" ? "bg-brand-600 text-white" : "text-slate-500"}`}
        >
          <ImageIcon className="h-4 w-4" /> Timetable Photo
        </button>
        <button
          onClick={() => setTab("csv")}
          className={`flex items-center gap-1.5 rounded-md px-3.5 py-2 text-sm font-semibold ${tab === "csv" ? "bg-brand-600 text-white" : "text-slate-500"}`}
        >
          <FileSpreadsheet className="h-4 w-4" /> CSV File
        </button>
      </div>

      {tab === "image" && (
        <div className="space-y-6">
          <Card>
            <CardBody className="flex flex-wrap items-center gap-4">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                className="block flex-1 text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-brand-700 hover:file:bg-brand-100"
              />
              <Button onClick={handleImageUpload} disabled={!imageFile} loading={uploading}>
                <Upload className="h-4 w-4" /> Upload &amp; Extract
              </Button>
            </CardBody>
          </Card>

          {uploading && <PageSpinner />}

          {imagePreview && !uploading && (
            <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
              <Card>
                <CardHeader>
                  <h2 className="text-sm font-semibold text-slate-700">Uploaded Image</h2>
                </CardHeader>
                <CardBody>
                  <img src={imagePreview} alt="Uploaded timetable" className="w-full rounded-lg border border-slate-200" />
                  {rawText && (
                    <details className="mt-4">
                      <summary className="cursor-pointer text-xs font-semibold text-slate-500">View raw OCR text</summary>
                      <pre className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                        {rawText}
                      </pre>
                    </details>
                  )}
                </CardBody>
              </Card>

              <Card>
                <CardHeader className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-700">
                    Review &amp; Correct {rows.length} Row{rows.length === 1 ? "" : "s"}
                  </h2>
                  <Button size="sm" variant="outline" onClick={() => setRows((prev) => [...prev, blankRow()])}>
                    <Plus className="h-3.5 w-3.5" /> Add Row
                  </Button>
                </CardHeader>
                <CardBody className="space-y-4">
                  {rows.length === 0 ? (
                    <p className="text-sm text-slate-400">No rows yet. Add one manually or upload a clearer image.</p>
                  ) : (
                    rows.map((row, i) => {
                      const rowSubjects = row.departmentId ? subjects.filter((s) => s.departmentId === row.departmentId) : subjects;
                      const rowRooms = row.blockId ? rooms.filter((r) => r.blockId === row.blockId) : rooms;
                      return (
                        <div key={i} className="rounded-xl border border-slate-200 p-4">
                          {row.rawLine && <p className="mb-3 truncate text-xs italic text-slate-400">Detected: "{row.rawLine}"</p>}
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                            <Select label="Faculty" value={row.facultyId} onChange={(e) => updateRow(i, { facultyId: e.target.value })}>
                              <option value="">Select</option>
                              {faculty.map((f) => (
                                <option key={f.id} value={f.id}>
                                  {f.fullName}
                                </option>
                              ))}
                            </Select>
                            <Select label="Department" value={row.departmentId} onChange={(e) => updateRow(i, { departmentId: e.target.value, subjectId: "" })}>
                              <option value="">Select</option>
                              {departments.map((d) => (
                                <option key={d.id} value={d.id}>
                                  {d.code}
                                </option>
                              ))}
                            </Select>
                            <Select label="Subject" value={row.subjectId} onChange={(e) => updateRow(i, { subjectId: e.target.value })}>
                              <option value="">Select</option>
                              {rowSubjects.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name}
                                </option>
                              ))}
                            </Select>
                            <Input label="Year" type="number" min={1} max={6} value={row.year} onChange={(e) => updateRow(i, { year: Number(e.target.value) })} />
                            <Input label="Section" value={row.section} onChange={(e) => updateRow(i, { section: e.target.value.toUpperCase() })} />
                            <Select label="Day" value={row.day} onChange={(e) => updateRow(i, { day: e.target.value as DayOfWeek })}>
                              {DAYS_OF_WEEK.map((d) => (
                                <option key={d} value={d}>
                                  {d.charAt(0) + d.slice(1).toLowerCase()}
                                </option>
                              ))}
                            </Select>
                            <Input label="Start" type="time" value={row.startTime} onChange={(e) => updateRow(i, { startTime: e.target.value })} />
                            <Input label="End" type="time" value={row.endTime} onChange={(e) => updateRow(i, { endTime: e.target.value })} />
                            <Select label="Block" value={row.blockId} onChange={(e) => updateRow(i, { blockId: e.target.value, roomId: "" })}>
                              <option value="">Select</option>
                              {blocks.map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.name}
                                </option>
                              ))}
                            </Select>
                            <Select label="Room" value={row.roomId} onChange={(e) => updateRow(i, { roomId: e.target.value })}>
                              <option value="">Select</option>
                              {rowRooms.map((r) => (
                                <option key={r.id} value={r.id}>
                                  {r.number}
                                </option>
                              ))}
                            </Select>
                          </div>
                          <button
                            onClick={() => removeRow(i)}
                            className="mt-3 flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Remove row
                          </button>
                        </div>
                      );
                    })
                  )}
                  {rows.length > 0 && (
                    <Button className="w-full" onClick={handleConfirm} loading={confirming}>
                      <CheckCircle2 className="h-4 w-4" /> Confirm &amp; Save {rows.length} Entries
                    </Button>
                  )}
                </CardBody>
              </Card>
            </div>
          )}

          {confirmResult && (
            <Card>
              <CardBody className="text-sm text-slate-700">
                <p className="font-semibold text-emerald-700">{confirmResult.created} entries saved successfully.</p>
                {confirmResult.failed > 0 && <p className="mt-1 text-amber-700">{confirmResult.failed} rows failed (likely conflicts) — check Timetable Management.</p>}
              </CardBody>
            </Card>
          )}
        </div>
      )}

      {tab === "csv" && (
        <Card>
          <CardBody className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">
                Upload a CSV with columns: <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">faculty_id, subject, department, year, section, day, start_time, end_time, room, block</code>
              </p>
              <a href="/import-templates/timetable.csv" download className="ml-4 flex shrink-0 items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-800">
                <Download className="h-3.5 w-3.5" /> Template
              </a>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)}
                className="block flex-1 text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-brand-700 hover:file:bg-brand-100"
              />
              <Button onClick={handleCsvUpload} disabled={!csvFile} loading={csvUploading}>
                <Upload className="h-4 w-4" /> Import CSV
              </Button>
            </div>
            {csvSummary && (
              <div className="rounded-lg border border-slate-200 p-4 text-sm">
                <p>
                  <span className="font-semibold text-emerald-700">{csvSummary.successRows} succeeded</span>
                  {csvSummary.failedRows > 0 && <span className="ml-3 font-semibold text-red-600">{csvSummary.failedRows} failed</span>}
                  <span className="ml-3 text-slate-400">of {csvSummary.totalRows} rows</span>
                </p>
                {csvSummary.errors.length > 0 && (
                  <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-xs text-red-600">
                    {csvSummary.errors.map((e, i) => (
                      <li key={i}>
                        Row {e.row}: {e.message}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
