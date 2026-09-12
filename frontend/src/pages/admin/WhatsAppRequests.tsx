import { useState } from "react";
import { motion } from "framer-motion";
import { MessageCircle, Check, X, Trash2 } from "lucide-react";
import { usePaginatedList } from "../../hooks/usePaginatedList";
import { whatsappService } from "../../services/whatsapp.service";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { EmptyState } from "../../components/ui/EmptyState";
import { Pagination } from "../../components/ui/Pagination";
import { SkeletonCardGrid } from "../../components/ui/Skeleton";
import { useToast } from "../../context/ToastContext";
import { getErrorMessage } from "../../services/api";
import { formatDate, titleCase, initials } from "../../utils/format";
import { WhatsAppRequest, WhatsAppRequestStatus } from "../../types";

const STATUS_TONE: Record<WhatsAppRequestStatus, "amber" | "green" | "red"> = {
  PENDING: "amber",
  APPROVED: "green",
  REJECTED: "red",
};

const STATUS_RING: Record<WhatsAppRequestStatus, string> = {
  PENDING: "ring-2 ring-amber-300",
  APPROVED: "ring-2 ring-emerald-300",
  REJECTED: "ring-2 ring-red-300",
};

export default function AdminWhatsAppRequests() {
  const [status, setStatus] = useState("");
  const { items, meta, page, setPage, loading, reload } = usePaginatedList<WhatsAppRequest>(whatsappService.listRequests, {
    status: status || undefined,
  });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WhatsAppRequest | null>(null);
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  async function updateStatus(req: WhatsAppRequest, newStatus: "APPROVED" | "REJECTED") {
    setBusyId(req.id);
    try {
      await whatsappService.updateRequestStatus(req.id, newStatus);
      toast.success(newStatus === "APPROVED" ? "Request approved" : "Request rejected");
      reload();
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
      await whatsappService.deleteRequest(deleteTarget.id);
      toast.success("Request deleted");
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
      <div>
        <h1 className="text-xl font-bold text-slate-900">WhatsApp Group Requests</h1>
        <p className="text-sm text-slate-500">Review and approve student requests to join WhatsApp groups.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {["", "PENDING", "APPROVED", "REJECTED"].map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${status === s ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          >
            {s ? titleCase(s) : "All"}
          </button>
        ))}
      </div>

      {loading ? (
        <SkeletonCardGrid count={4} />
      ) : items.length === 0 ? (
        <EmptyState icon={MessageCircle} title="No requests found" />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {items.map((r, i) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.04 }}
                className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-700 text-sm font-bold text-white ${STATUS_RING[r.status]}`}
                >
                  {initials(r.student?.fullName ?? "?")}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">{r.student?.fullName}</p>
                  <p className="truncate text-xs text-slate-500">
                    wants to join <span className="font-medium text-slate-700">{r.group?.name}</span>
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {r.department} &middot; Y{r.year}-{r.section} &middot; {formatDate(r.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <Badge tone={STATUS_TONE[r.status]}>{titleCase(r.status)}</Badge>
                  <div className="flex gap-1">
                    {r.status === "PENDING" && (
                      <>
                        <button
                          onClick={() => updateStatus(r, "APPROVED")}
                          disabled={busyId === r.id}
                          className="rounded-full bg-emerald-50 p-1.5 text-emerald-600 hover:bg-emerald-100"
                          title="Approve"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => updateStatus(r, "REJECTED")}
                          disabled={busyId === r.id}
                          className="rounded-full bg-red-50 p-1.5 text-red-600 hover:bg-red-100"
                          title="Reject"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setDeleteTarget(r)}
                      className="rounded-full bg-slate-50 p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          <Card>
            <Pagination meta={{ ...meta, page }} onPageChange={setPage} />
          </Card>
        </>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete request?"
        message="This request will be permanently removed."
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
