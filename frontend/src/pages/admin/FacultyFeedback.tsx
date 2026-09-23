import { useEffect, useState } from "react";
import { MessageSquareText, Download, Send, CheckCircle2, Users, XCircle } from "lucide-react";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Select } from "../../components/ui/FormField";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { EmptyState } from "../../components/ui/EmptyState";
import { SkeletonTable } from "../../components/ui/Skeleton";
import { ReportActions } from "../../components/reports/ReportActions";
import { ReportPreview } from "../../components/reports/ReportPreview";
import { FeedbackDetailReport } from "../../components/feedback/FeedbackDetailReport";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage } from "../../services/api";
import { getDisplayName } from "../../utils/displayName";
import { feedbackService } from "../../services/feedback.service";
import { generateFeedbackClassReportPdf, generateFacultyFeedbackReportPdf } from "../../utils/reportPdf";
import { useDepartmentOptions } from "../../hooks/useDepartmentOptions";
import { CLASS_OPTIONS, SECTION_OPTIONS, ACADEMIC_YEAR_OPTIONS } from "../../constants/academicClass";
import {
  FeedbackClassReportRow,
  FeedbackFacultyListRow,
  FeedbackFacultyDetail,
  FeedbackPublishStatus,
  FeedbackSubmissionStatus,
} from "../../types";

const currentAcademicYear = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

type Tab = "class" | "faculty" | "status";

function ClassReportFieldGrid({
  department,
  year,
  section,
  academicYear,
}: {
  department: string;
  year: number;
  section: string;
  academicYear: string;
}) {
  const rows: [string, string][] = [
    ["Department", department],
    ["Year / Section", `Year ${year} - ${section}`],
    ["Academic Year", academicYear],
    ["Date", new Date().toLocaleDateString("en-IN", { dateStyle: "medium" })],
  ];
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-3 border-b border-dashed border-slate-100 pb-1.5 sm:border-none sm:pb-0">
          <dt className="text-slate-500">{label}</dt>
          <dd className="text-right font-semibold text-brand-950">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ClassReportTable({ rows }: { rows: FeedbackClassReportRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-3 py-2">Subject</th>
            <th className="px-3 py-2">Faculty Name</th>
            <th className="px-3 py-2 text-right">Percentage</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => (
            <tr key={`${r.facultyId}-${r.subjectId}`}>
              <td className="px-3 py-2 font-medium text-brand-950">
                {r.subjectName} <span className="text-xs font-normal text-slate-400">({r.subjectCode})</span>
              </td>
              <td className="px-3 py-2 text-slate-700">{r.facultyName}</td>
              <td className="px-3 py-2 text-right font-serif font-bold text-brand-950">
                {r.percentage === null ? <span className="font-sans text-slate-300">No feedback yet</span> : `${r.percentage.toFixed(2)}%`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function FacultyFeedback() {
  const departments = useDepartmentOptions();
  const [departmentId, setDepartmentId] = useState("");
  const [classKey, setClassKey] = useState(CLASS_OPTIONS[0].key);
  const [section, setSection] = useState(SECTION_OPTIONS[0]);
  const [academicYear, setAcademicYear] = useState(
    ACADEMIC_YEAR_OPTIONS.includes(currentAcademicYear) ? currentAcademicYear : ACADEMIC_YEAR_OPTIONS[ACADEMIC_YEAR_OPTIONS.length - 1]
  );
  const [tab, setTab] = useState<Tab>("class");
  const toast = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (departments.length === 1 && !departmentId) setDepartmentId(departments[0].id);
  }, [departments, departmentId]);

  const year = CLASS_OPTIONS.find((o) => o.key === classKey)!.year;
  const canLoad = !!departmentId && !!section.trim();
  const params = { departmentId, year, section, academicYear };
  const department = departments.find((d) => d.id === departmentId);

  // Tab 1 — Overall Class Report
  const [classReport, setClassReport] = useState<FeedbackClassReportRow[] | null>(null);
  const [loadingClassReport, setLoadingClassReport] = useState(false);
  const [downloadingClass, setDownloadingClass] = useState(false);
  const [classPreviewOpen, setClassPreviewOpen] = useState(false);
  const [classAutoPrint, setClassAutoPrint] = useState(false);

  async function loadClassReport() {
    if (!canLoad) return;
    setLoadingClassReport(true);
    setClassReport(null);
    try {
      setClassReport(await feedbackService.classReport(params));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoadingClassReport(false);
    }
  }

  async function downloadClassReport() {
    if (!classReport || !department) return;
    setDownloadingClass(true);
    try {
      await generateFeedbackClassReportPdf(
        { department: department.name, departmentCode: department.code, year, section, academicYear, rows: classReport },
        getDisplayName(user)
      );
      toast.success("Report generated successfully.");
    } catch {
      toast.error("Unable to generate the report. Please try again.");
    } finally {
      setDownloadingClass(false);
    }
  }

  // Tab 2 — Faculty-wise Feedback Analysis
  const [facultyList, setFacultyList] = useState<FeedbackFacultyListRow[] | null>(null);
  const [loadingFacultyList, setLoadingFacultyList] = useState(false);
  const [publishStatus, setPublishStatus] = useState<FeedbackPublishStatus | null>(null);
  const [detail, setDetail] = useState<FeedbackFacultyDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<string | null>(null);
  const [downloadingDetail, setDownloadingDetail] = useState(false);
  const [detailAutoPrint, setDetailAutoPrint] = useState(false);
  const [confirmPublishOpen, setConfirmPublishOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);

  async function loadFacultyList() {
    if (!canLoad) return;
    setLoadingFacultyList(true);
    setFacultyList(null);
    try {
      const [list, status] = await Promise.all([feedbackService.facultyList(params), feedbackService.publishStatus(params)]);
      setFacultyList(list);
      setPublishStatus(status);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoadingFacultyList(false);
    }
  }

  async function openDetail(row: FeedbackFacultyListRow) {
    setLoadingDetail(`${row.facultyId}:${row.subjectId}`);
    try {
      const d = await feedbackService.facultyDetail({ ...params, facultyId: row.facultyId, subjectId: row.subjectId });
      setDetail(d);
      setDetailAutoPrint(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoadingDetail(null);
    }
  }

  async function downloadDetail() {
    if (!detail) return;
    setDownloadingDetail(true);
    try {
      await generateFacultyFeedbackReportPdf(detail, getDisplayName(user));
      toast.success("Report generated successfully.");
    } catch {
      toast.error("Unable to generate the report. Please try again.");
    } finally {
      setDownloadingDetail(false);
    }
  }

  async function handlePublish() {
    setPublishing(true);
    try {
      const message = await feedbackService.publish(params);
      toast.success(message);
      setConfirmPublishOpen(false);
      setPublishStatus({ published: true, publishedAt: new Date().toISOString() });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setPublishing(false);
    }
  }

  // Tab 3 — Feedback Submitted (per-student status)
  const [submissionStatus, setSubmissionStatus] = useState<FeedbackSubmissionStatus | null>(null);
  const [loadingSubmissionStatus, setLoadingSubmissionStatus] = useState(false);

  async function loadSubmissionStatus() {
    if (!canLoad) return;
    setLoadingSubmissionStatus(true);
    setSubmissionStatus(null);
    try {
      setSubmissionStatus(await feedbackService.submissionStatus(params));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoadingSubmissionStatus(false);
    }
  }

  const filterRow = (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Select label="Department" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
        <option value="">Select</option>
        {departments.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </Select>
      <Select label="Year" value={classKey} onChange={(e) => setClassKey(e.target.value)}>
        {CLASS_OPTIONS.map((o) => (
          <option key={o.key} value={o.key}>
            {o.label}
          </option>
        ))}
      </Select>
      <Select label="Section" value={section} onChange={(e) => setSection(e.target.value)}>
        {SECTION_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </Select>
      <Select label="Academic Year" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)}>
        {ACADEMIC_YEAR_OPTIONS.map((ay) => (
          <option key={ay} value={ay}>
            {ay}
          </option>
        ))}
      </Select>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageSquareText className="h-4 w-4 text-brand-600" />
          <h2 className="font-semibold text-slate-800">Faculty Feedback</h2>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Review submitted student feedback for a class, drill into a specific faculty/subject, and publish results once
          they're ready for faculty to see.
        </p>
      </CardHeader>
      <CardBody className="space-y-5">
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
          <button
            onClick={() => setTab("class")}
            className={`rounded-md px-3.5 py-1.5 text-sm font-semibold transition-colors ${
              tab === "class" ? "bg-white text-brand-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Overall Class Report
          </button>
          <button
            onClick={() => setTab("faculty")}
            className={`rounded-md px-3.5 py-1.5 text-sm font-semibold transition-colors ${
              tab === "faculty" ? "bg-white text-brand-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Faculty-wise Feedback Analysis
          </button>
          <button
            onClick={() => setTab("status")}
            className={`rounded-md px-3.5 py-1.5 text-sm font-semibold transition-colors ${
              tab === "status" ? "bg-white text-brand-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Feedback Submitted
          </button>
        </div>

        {filterRow}

        {tab === "class" ? (
          <div className="space-y-4">
            <Button onClick={loadClassReport} disabled={!canLoad} loading={loadingClassReport}>
              Load Report
            </Button>

            {loadingClassReport && <SkeletonTable cols={3} />}

            {!loadingClassReport && classReport && classReport.length === 0 && (
              <EmptyState
                icon={MessageSquareText}
                title="No faculty/subjects found"
                description="No timetable entries match that department, year and section."
              />
            )}

            {!loadingClassReport && classReport && classReport.length > 0 && department && (
              <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <ClassReportFieldGrid department={`${department.name} (${department.code})`} year={year} section={section} academicYear={academicYear} />
                <ClassReportTable rows={classReport} />
                <ReportActions
                  onPreview={() => {
                    setClassAutoPrint(false);
                    setClassPreviewOpen(true);
                  }}
                  onDownload={downloadClassReport}
                  onPrint={() => {
                    setClassAutoPrint(true);
                    setClassPreviewOpen(true);
                  }}
                  downloading={downloadingClass}
                />
              </div>
            )}
          </div>
        ) : tab === "faculty" ? (
          <div className="space-y-4">
            <Button onClick={loadFacultyList} disabled={!canLoad} loading={loadingFacultyList}>
              Load Faculty
            </Button>

            {loadingFacultyList && <SkeletonTable cols={3} />}

            {!loadingFacultyList && facultyList && facultyList.length === 0 && (
              <EmptyState
                icon={MessageSquareText}
                title="No faculty/subjects found"
                description="No timetable entries match that department, year and section."
              />
            )}

            {!loadingFacultyList && facultyList && facultyList.length > 0 && (
              <div className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {facultyList.map((r) => {
                    const key = `${r.facultyId}:${r.subjectId}`;
                    return (
                      <div key={key} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-800">{r.facultyName}</p>
                          <p className="truncate text-xs text-slate-400">{r.subjectName}</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => openDetail(r)} loading={loadingDetail === key}>
                          <Download className="h-3.5 w-3.5" /> Download
                        </Button>
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gold-200 bg-gold-50 px-5 py-4">
                  <div>
                    <p className="font-serif font-semibold text-brand-950">Publish results to Faculty</p>
                    <p className="text-xs text-slate-500">
                      {publishStatus?.published
                        ? `Published on ${new Date(publishStatus.publishedAt!).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}`
                        : "Feedback stays hidden from faculty until you publish it."}
                    </p>
                  </div>
                  <Button onClick={() => setConfirmPublishOpen(true)} size="lg">
                    {publishStatus?.published ? <CheckCircle2 className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                    {publishStatus?.published ? "Re-Publish" : "POST"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <Button onClick={loadSubmissionStatus} disabled={!canLoad} loading={loadingSubmissionStatus}>
              Load Status
            </Button>

            {loadingSubmissionStatus && <SkeletonTable cols={4} />}

            {!loadingSubmissionStatus && submissionStatus && submissionStatus.students.length === 0 && (
              <EmptyState
                icon={Users}
                title="No students found"
                description="No students match that department, year and section."
              />
            )}

            {!loadingSubmissionStatus && submissionStatus && submissionStatus.students.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">
                  Based on {submissionStatus.totalTargets} faculty/subject{submissionStatus.totalTargets === 1 ? "" : "s"} on this
                  class's timetable — a student counts as "Submitted" only once feedback is given for every one of them.
                </p>
                <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        <th className="px-4 py-3">Roll No</th>
                        <th className="px-4 py-3">Student Name</th>
                        <th className="px-4 py-3 text-center">Progress</th>
                        <th className="px-4 py-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {submissionStatus.students.map((s, i) => (
                        <tr key={s.studentId} className={i % 2 === 1 ? "bg-slate-50" : "bg-white"}>
                          <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{s.studentId}</td>
                          <td className="px-4 py-2.5 font-medium text-slate-800">{s.fullName}</td>
                          <td className="px-4 py-2.5 text-center text-slate-500">
                            {s.submittedCount} / {s.totalTargets}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <Badge tone={s.submitted ? "green" : "amber"}>
                              {s.submitted ? (
                                <span className="flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3" /> Submitted
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <XCircle className="h-3 w-3" /> Not Submitted
                                </span>
                              )}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </CardBody>

      {department && classReport && (
        <ReportPreview
          open={classPreviewOpen}
          onClose={() => setClassPreviewOpen(false)}
          reportTitle="Faculty Feedback Report"
          titleBadge={academicYear}
          generatedBy={getDisplayName(user)}
          onDownload={downloadClassReport}
          downloading={downloadingClass}
          autoPrint={classAutoPrint}
        >
          <ClassReportFieldGrid department={`${department.name} (${department.code})`} year={year} section={section} academicYear={academicYear} />
          <div className="mt-4">
            <ClassReportTable rows={classReport} />
          </div>
        </ReportPreview>
      )}

      {detail && (
        <ReportPreview
          open={!!detail}
          onClose={() => setDetail(null)}
          reportTitle={`Feedback Analysis Report : ${detail.departmentCode}-${detail.section} ${detail.year} Sem`}
          titleBadge={detail.academicYear}
          generatedBy={getDisplayName(user)}
          onDownload={downloadDetail}
          downloading={downloadingDetail}
          autoPrint={detailAutoPrint}
        >
          <FeedbackDetailReport detail={detail} />
        </ReportPreview>
      )}

      <ConfirmDialog
        open={confirmPublishOpen}
        title="Publish feedback results?"
        message="Are you sure you want to publish the feedback results to Faculty?"
        confirmLabel="Publish"
        danger={false}
        loading={publishing}
        onConfirm={handlePublish}
        onCancel={() => setConfirmPublishOpen(false)}
      />
    </Card>
  );
}

export default FacultyFeedback;
