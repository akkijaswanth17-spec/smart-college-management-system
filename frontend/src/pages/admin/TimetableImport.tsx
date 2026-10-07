import { useEffect, useState } from "react";
import { Image as ImageIcon, FileSpreadsheet, FileText, Upload, Trash2, CheckCircle2, Plus, Download } from "lucide-react";
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
  /** Detected subject code/name shown next to the Subject select, independent of
   * whether a confident auto-match was found — lets the admin confirm/correct fast. */
  detectedSubjectText?: string;
  /** Detected faculty name shown next to the Faculty select, same reasoning. */
  detectedFacultyText?: string;
}

interface LegendRow {
  code: string | null;
  subjectName: string;
  facultyName: string;
}

interface DetectedHeader {
  departmentText: string | null;
  academicYear: string | null;
  classSemesterText: string | null;
}

function normalizeForMatch(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Best-effort fuzzy match by shared-word overlap — OCR text is never an exact match
 * against the real subject/faculty names, so this picks the closest candidate rather
 * than requiring an exact string match. Returns null below a minimum overlap. */
function bestMatch<T>(target: string, candidates: T[], label: (c: T) => string): T | null {
  const targetWords = new Set(normalizeForMatch(target).split(" ").filter((w) => w.length > 1));
  if (targetWords.size === 0) return null;

  let best: T | null = null;
  let bestScore = 0;
  for (const c of candidates) {
    const candWords = normalizeForMatch(label(c)).split(" ").filter((w) => w.length > 1);
    const overlap = candWords.filter((w) => targetWords.has(w)).length;
    const score = overlap / Math.max(targetWords.size, candWords.length);
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return bestScore >= 0.4 ? best : null;
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
  const [tab, setTab] = useState<"image" | "word" | "csv">("image");
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
  const [legend, setLegend] = useState<LegendRow[]>([]);
  const [header, setHeader] = useState<DetectedHeader | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmResult, setConfirmResult] = useState<{ created: number; failed: number } | null>(null);

  async function handleImageUpload() {
    if (!imageFile) return;
    setUploading(true);
    try {
      const result = await importService.timetableImage(imageFile);
      setImagePreview(result.imageUrl);
      setRawText(result.rawText);
      setLegend(result.legend ?? []);
      setHeader(result.header ?? null);
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
      if (result.rows.length === 0 && (!result.legend || result.legend.length === 0)) {
        toast.error("Nothing could be reliably extracted from this image. Try a higher-resolution photo, or use the CSV import instead.");
      } else if (result.rows.length === 0) {
        toast.success(
          `Detected ${result.legend.length} subject(s)/faculty from the legend table below — the day-by-day grid itself couldn't be read reliably from this image, so add each period manually using "Use" on a subject.`
        );
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  // ---- Word (.docx) flow — table cells are exact text, so subject/faculty/day/time
  // can usually be resolved automatically instead of needing per-row manual picks. ----
  const [wordFile, setWordFile] = useState<File | null>(null);

  async function handleWordUpload() {
    if (!wordFile) return;
    setUploading(true);
    try {
      const result = await importService.timetableWord(wordFile);
      setImagePreview(null);
      setRawText(result.rawText);
      setLegend(result.legend ?? []);
      setHeader(result.header ?? null);

      const legendRows = result.legend ?? [];
      setRows(
        (result.rows as any[]).map((r) => {
          const matchedLegend = r.subjectText ? resolveLegendForCell(String(r.subjectText), legendRows) : null;
          const subjectLabel = matchedLegend?.subjectName ?? r.subjectText ?? undefined;
          const facultyLabel = matchedLegend?.facultyName ?? undefined;
          const matchedSubject = subjectLabel ? bestMatch(subjectLabel, subjects, (s) => s.name) : null;
          const matchedFaculty = facultyLabel ? bestMatch(facultyLabel, faculty, (f) => f.fullName) : null;
          return blankRow({
            day: (r.day as DayOfWeek) ?? "MONDAY",
            startTime: r.startTime ?? "09:00",
            endTime: r.endTime ?? "10:00",
            subjectId: matchedSubject?.id ?? "",
            facultyId: matchedFaculty?.id ?? "",
            departmentId: matchedSubject?.departmentId ?? "",
            rawLine: r.rawLine,
            detectedSubjectText: subjectLabel ? (matchedLegend?.code ? `${matchedLegend.code} — ${subjectLabel}` : subjectLabel) : undefined,
            detectedFacultyText: facultyLabel,
          });
        })
      );
      setConfirmResult(null);
      if (result.rows.length === 0) {
        toast.error("No day-by-day grid table was recognized in this document. You can still use the legend below, or add rows manually.");
      } else {
        toast.success(`Extracted ${result.rows.length} period(s) from the table — review the pre-filled subject/faculty below, then confirm.`);
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  /** Adds a new blank row pre-filled from a legend entry — matches the OCR'd
   * subject/faculty names against real records so the admin only has to pick
   * department/year/section/day/time/room instead of hunting both dropdowns too. */
  function useLegendRow(entry: LegendRow) {
    const matchedFaculty = bestMatch(entry.facultyName, faculty, (f) => f.fullName);
    const matchedSubject = bestMatch(entry.subjectName, subjects, (s) => s.name);
    setRows((prev) => [
      ...prev,
      blankRow({
        facultyId: matchedFaculty?.id ?? "",
        subjectId: matchedSubject?.id ?? "",
        departmentId: matchedSubject?.departmentId ?? "",
        rawLine: `From legend: ${entry.code ? entry.code + " — " : ""}${entry.subjectName} / ${entry.facultyName}`,
        detectedSubjectText: entry.code ? `${entry.code} — ${entry.subjectName}` : entry.subjectName,
        detectedFacultyText: entry.facultyName,
      }),
    ]);
    toast.success(
      matchedSubject || matchedFaculty
        ? "Row added — check the pre-filled subject/faculty, then set day, time and section."
        : "Row added, but no matching subject/faculty was found in the system — please select them manually."
    );
  }

  /** A grid cell's text (e.g. "SM" or "AE&E LAB") against the legend — tries the
   * legend's code first (exact), then falls back to fuzzy name matching, since a
   * Word table's grid cells are usually a short abbreviation of the full subject
   * name printed in the legend table, not the name itself. */
  function resolveLegendForCell(cellText: string, legendRows: LegendRow[]): LegendRow | null {
    const byCode = legendRows.find((l) => l.code && normalizeForMatch(l.code) === normalizeForMatch(cellText));
    if (byCode) return byCode;
    return bestMatch(cellText, legendRows, (l) => l.subjectName) ?? bestMatch(cellText, legendRows, (l) => l.code ?? "");
  }

  function updateRow(index: number, patch: Partial<EditableRow>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  // ---- Bulk-fill: a whole timetable upload is almost always one class, so
  // letting the admin set department/year/section/block/room ONCE and apply
  // it to every extracted row avoids repeating the same picks dozens of times. ----
  const [bulkDepartmentId, setBulkDepartmentId] = useState("");
  const [bulkClassKey, setBulkClassKey] = useState("");
  const [bulkSection, setBulkSection] = useState("");
  const [bulkBlockId, setBulkBlockId] = useState("");
  const [bulkRoomId, setBulkRoomId] = useState("");

  function applyBulkToAllRows() {
    const year = Number(bulkClassKey) || undefined;
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        departmentId: bulkDepartmentId || r.departmentId,
        year: year ?? r.year,
        section: bulkSection ? bulkSection.toUpperCase() : r.section,
        blockId: bulkBlockId || r.blockId,
        roomId: bulkRoomId || r.roomId,
      }))
    );
    toast.success(`Applied to all ${rows.length} rows.`);
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
      const payload = rows.map(({ rawLine, detectedSubjectText, detectedFacultyText, ...r }) => r);
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
          onClick={() => setTab("word")}
          className={`flex items-center gap-1.5 rounded-md px-3.5 py-2 text-sm font-semibold ${tab === "word" ? "bg-brand-600 text-white" : "text-slate-500"}`}
        >
          <FileText className="h-4 w-4" /> Word Document
        </button>
        <button
          onClick={() => setTab("csv")}
          className={`flex items-center gap-1.5 rounded-md px-3.5 py-2 text-sm font-semibold ${tab === "csv" ? "bg-brand-600 text-white" : "text-slate-500"}`}
        >
          <FileSpreadsheet className="h-4 w-4" /> CSV / Excel File
        </button>
      </div>

      {(tab === "image" || tab === "word") && (
        <div className="space-y-6">
          <Card>
            <CardBody className="flex flex-wrap items-center gap-4">
              {tab === "image" ? (
                <>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                    className="block flex-1 text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-brand-700 hover:file:bg-brand-100"
                  />
                  <Button onClick={handleImageUpload} disabled={!imageFile} loading={uploading}>
                    <Upload className="h-4 w-4" /> Upload &amp; Extract
                  </Button>
                </>
              ) : (
                <>
                  <input
                    type="file"
                    accept=".docx"
                    onChange={(e) => setWordFile(e.target.files?.[0] ?? null)}
                    className="block flex-1 text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-brand-700 hover:file:bg-brand-100"
                  />
                  <Button onClick={handleWordUpload} disabled={!wordFile} loading={uploading}>
                    <Upload className="h-4 w-4" /> Upload &amp; Extract
                  </Button>
                </>
              )}
            </CardBody>
          </Card>

          {uploading && <PageSpinner />}

          {!uploading && (header || legend.length > 0) && (
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold text-slate-700">Detected Class Info &amp; Subjects</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Read from the header and the subject/faculty legend table. The day-by-day grid itself is small,
                  dense text and often isn't reliable to auto-read — click "Use" on a subject below to add a row
                  pre-filled with its matched subject/faculty, then just set the day, time and section.
                </p>
              </CardHeader>
              <CardBody className="space-y-4">
                {header && (header.departmentText || header.academicYear || header.classSemesterText) && (
                  <div className="flex flex-wrap gap-4 rounded-lg bg-slate-50 px-4 py-3 text-xs text-slate-600">
                    {header.departmentText && (
                      <span>
                        <span className="font-semibold text-slate-800">Department:</span> {header.departmentText}
                      </span>
                    )}
                    {header.classSemesterText && (
                      <span>
                        <span className="font-semibold text-slate-800">Class/Semester:</span>{" "}
                        {header.classSemesterText}
                      </span>
                    )}
                    {header.academicYear && (
                      <span>
                        <span className="font-semibold text-slate-800">Academic Year:</span> {header.academicYear}
                      </span>
                    )}
                  </div>
                )}

                {legend.length > 0 && (
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-bold uppercase text-slate-500">Code</th>
                          <th className="px-3 py-2 text-left text-xs font-bold uppercase text-slate-500">Subject</th>
                          <th className="px-3 py-2 text-left text-xs font-bold uppercase text-slate-500">Faculty</th>
                          <th className="px-3 py-2 text-right text-xs font-bold uppercase text-slate-500">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {legend.map((l, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2 text-slate-500">{l.code ?? "—"}</td>
                            <td className="px-3 py-2 text-slate-700">{l.subjectName}</td>
                            <td className="px-3 py-2 text-slate-700">{l.facultyName}</td>
                            <td className="px-3 py-2 text-right">
                              <Button size="sm" variant="outline" onClick={() => useLegendRow(l)}>
                                <Plus className="h-3.5 w-3.5" /> Use
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardBody>
            </Card>
          )}

          {!uploading && (imagePreview || rows.length > 0 || legend.length > 0) && (
            <div className={`grid gap-6 ${imagePreview ? "lg:grid-cols-[320px_1fr]" : ""}`}>
              {imagePreview && (
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
              )}

              <div className="space-y-6">
              {rows.length > 0 && (
                <Card>
                  <CardHeader>
                    <h2 className="text-sm font-semibold text-slate-700">Apply to All Rows</h2>
                    <p className="mt-1 text-xs text-slate-500">
                      One upload is almost always one class — set these once and apply them to every extracted row
                      instead of repeating the same picks for each one.
                    </p>
                  </CardHeader>
                  <CardBody className="flex flex-wrap items-end gap-3">
                    <Select label="Department" value={bulkDepartmentId} onChange={(e) => setBulkDepartmentId(e.target.value)}>
                      <option value="">—</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.code}
                        </option>
                      ))}
                    </Select>
                    <Input label="Year" type="number" min={1} max={6} value={bulkClassKey} onChange={(e) => setBulkClassKey(e.target.value)} />
                    <Input label="Section" value={bulkSection} onChange={(e) => setBulkSection(e.target.value.toUpperCase())} />
                    <Select label="Block" value={bulkBlockId} onChange={(e) => setBulkBlockId(e.target.value)}>
                      <option value="">—</option>
                      {blocks.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </Select>
                    <Select label="Room" value={bulkRoomId} onChange={(e) => setBulkRoomId(e.target.value)}>
                      <option value="">—</option>
                      {rooms.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.number}
                        </option>
                      ))}
                    </Select>
                    <Button variant="outline" onClick={applyBulkToAllRows}>
                      Apply to {rows.length} Row{rows.length === 1 ? "" : "s"}
                    </Button>
                  </CardBody>
                </Card>
              )}

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
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                            <div>
                              <Select label="Faculty" value={row.facultyId} onChange={(e) => updateRow(i, { facultyId: e.target.value })}>
                                <option value="">Select</option>
                                {faculty.map((f) => (
                                  <option key={f.id} value={f.id}>
                                    {f.fullName}
                                  </option>
                                ))}
                              </Select>
                              {row.detectedFacultyText && (
                                <p className="mt-1 truncate text-xs italic text-slate-400" title={row.detectedFacultyText}>
                                  Detected: {row.detectedFacultyText}
                                </p>
                              )}
                            </div>
                            <Select label="Department" value={row.departmentId} onChange={(e) => updateRow(i, { departmentId: e.target.value, subjectId: "" })}>
                              <option value="">Select</option>
                              {departments.map((d) => (
                                <option key={d.id} value={d.id}>
                                  {d.code}
                                </option>
                              ))}
                            </Select>
                            <div>
                              <Select label="Subject" value={row.subjectId} onChange={(e) => updateRow(i, { subjectId: e.target.value })}>
                                <option value="">Select</option>
                                {rowSubjects.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.name}
                                  </option>
                                ))}
                              </Select>
                              {row.detectedSubjectText && (
                                <p className="mt-1 truncate text-xs italic text-slate-400" title={row.detectedSubjectText}>
                                  Detected: {row.detectedSubjectText}
                                </p>
                              )}
                            </div>
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
                Upload a CSV or Excel (.xlsx/.xls) file with columns: <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">faculty_id, subject, department, year, section, day, start_time, end_time, room, block</code>
              </p>
              <a href="/import-templates/timetable.csv" download className="ml-4 flex shrink-0 items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-800">
                <Download className="h-3.5 w-3.5" /> Template
              </a>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)}
                className="block flex-1 text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-brand-700 hover:file:bg-brand-100"
              />
              <Button onClick={handleCsvUpload} disabled={!csvFile} loading={csvUploading}>
                <Upload className="h-4 w-4" /> Import File
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
