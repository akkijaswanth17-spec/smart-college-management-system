import { useEffect, useState } from "react";
import { ClipboardList, Check, X } from "lucide-react";
import { Card, CardHeader, CardBody } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Select, Textarea } from "../ui/FormField";
import { EmptyState } from "../ui/EmptyState";
import { SkeletonList } from "../ui/Skeleton";
import { Modal } from "../ui/Modal";
import { attendanceService } from "../../services/attendance.service";
import { useToast } from "../../context/ToastContext";
import { getErrorMessage } from "../../services/api";
import { formatDate } from "../../utils/format";
import { Department, LeaveRequest, LeaveStatus } from "../../types";
import { CLASS_OPTIONS, SECTION_OPTIONS } from "../../constants/academicClass";

const STATUS_TONE: Record<LeaveStatus, "amber" | "green" | "red"> = {
  PENDING: "amber",
  APPROVED: "green",
  REJECTED: "red",
};

export function LeaveRequestsPanel({ departments }: { departments: Department[] }) {
  const [departmentId, setDepartmentId] = useState("");
  const [classKey, setClassKey] = useState("");
  const [section, setSection] = useState("");
  const [status, setStatus] = useState("");
  const [requests, setRequests] = useState<LeaveRequest[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewTarget, setReviewTarget] = useState<LeaveRequest | null>(null);
  const [reviewDecision, setReviewDecision] = useState<"APPROVED" | "REJECTED">("APPROVED");
  const [remarks, setRemarks] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (departments.length >= 1 && !departmentId) setDepartmentId(departments[0].id);
  }, [departments, departmentId]);

  async function load() {
    setLoading(true);
    try {
      const year = CLASS_OPTIONS.find((o) => o.key === classKey)?.year;
      const data = await attendanceService.listLeaveRequests({
        departmentId: departmentId || undefined,
        year,
        section: section || undefined,
        status: status || undefined,
      });
      setRequests(data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departmentId, classKey, section, status]);

  function openReview(req: LeaveRequest, decision: "APPROVED" | "REJECTED") {
    setReviewTarget(req);
    setReviewDecision(decision);
    setRemarks("");
  }

  async function submitReview() {
    if (!reviewTarget) return;
    setReviewing(true);
    try {
      await attendanceService.reviewLeave(reviewTarget.id, { status: reviewDecision, remarks: remarks || undefined });
      toast.success(`Leave request ${reviewDecision.toLowerCase()}`);
      setReviewTarget(null);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setReviewing(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-brand-600" />
          <h2 className="font-semibold text-slate-800">Leave Requests</h2>
        </div>
        <p className="mt-1 text-xs text-slate-500">Only requests from your own classes/sections appear here.</p>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {departments.length > 0 && (
            <Select label="Department" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          )}
          <Select label="Year" value={classKey} onChange={(e) => setClassKey(e.target.value)}>
            <option value="">All</option>
            {CLASS_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </Select>
          <Select label="Section" value={section} onChange={(e) => setSection(e.target.value)}>
            <option value="">All</option>
            {SECTION_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </Select>
        </div>

        {loading ? (
          <SkeletonList rows={4} />
        ) : !requests || requests.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No leave requests" description="Nothing matches these filters." />
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-bold uppercase text-slate-500">Student</th>
                  <th className="px-4 py-2.5 text-left text-xs font-bold uppercase text-slate-500">Date</th>
                  <th className="px-4 py-2.5 text-left text-xs font-bold uppercase text-slate-500">Reason</th>
                  <th className="px-4 py-2.5 text-left text-xs font-bold uppercase text-slate-500">Status</th>
                  <th className="px-4 py-2.5 text-right text-xs font-bold uppercase text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-slate-800">{r.student?.fullName}</p>
                      <p className="text-xs text-slate-400">{r.student?.studentId}</p>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{formatDate(r.leaveDate)}</td>
                    <td className="max-w-xs truncate px-4 py-2.5 text-slate-600" title={r.reason}>
                      {r.reason}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {r.status === "PENDING" ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openReview(r, "APPROVED")}
                            className="rounded-lg bg-emerald-50 p-1.5 text-emerald-600 hover:bg-emerald-100"
                            title="Approve"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openReview(r, "REJECTED")}
                            className="rounded-lg bg-red-50 p-1.5 text-red-600 hover:bg-red-100"
                            title="Reject"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Reviewed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>

      <Modal
        open={!!reviewTarget}
        onClose={() => setReviewTarget(null)}
        title={reviewDecision === "APPROVED" ? "Approve Leave Request" : "Reject Leave Request"}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            {reviewTarget?.student?.fullName} — {reviewTarget && formatDate(reviewTarget.leaveDate)}
          </p>
          <Textarea
            label="Remarks (optional)"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Optional note for the student"
          />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setReviewTarget(null)}>
              Cancel
            </Button>
            <Button
              variant={reviewDecision === "REJECTED" ? "danger" : "primary"}
              onClick={submitReview}
              loading={reviewing}
            >
              Confirm {reviewDecision === "APPROVED" ? "Approval" : "Rejection"}
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}
