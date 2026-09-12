import { useEffect, useState, FormEvent } from "react";
import { MessageCircle, Send, ExternalLink } from "lucide-react";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Input, Select, Textarea } from "../../components/ui/FormField";
import { SkeletonCard, SkeletonList } from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/ui/EmptyState";
import { StaggerContainer, StaggerItem } from "../../components/motion/Stagger";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { getErrorMessage } from "../../services/api";
import { whatsappService } from "../../services/whatsapp.service";
import { formatDate, titleCase, initials } from "../../utils/format";
import { WhatsAppGroup, WhatsAppRequest, WhatsAppRequestStatus } from "../../types";

const STATUS_TONE: Record<WhatsAppRequestStatus, "amber" | "green" | "red"> = {
  PENDING: "amber",
  APPROVED: "green",
  REJECTED: "red",
};

export default function StudentWhatsApp() {
  const { user } = useAuth();
  const student = user?.student;
  const [groups, setGroups] = useState<WhatsAppGroup[]>([]);
  const [requests, setRequests] = useState<WhatsAppRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const [form, setForm] = useState({ groupId: "", phone: "", reason: "" });

  async function loadAll() {
    setLoading(true);
    try {
      const [g, r] = await Promise.all([whatsappService.listGroups(), whatsappService.myRequests()]);
      setGroups(g);
      setRequests(r);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!student) return;
    setSubmitting(true);
    try {
      await whatsappService.createRequest({
        groupId: form.groupId,
        phone: form.phone,
        department: student.departmentId,
        year: student.year,
        section: student.section,
        reason: form.reason,
      });
      toast.success("Request submitted for admin approval");
      setForm({ groupId: "", phone: "", reason: "" });
      loadAll();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">WhatsApp Groups</h1>
        <p className="text-sm text-slate-500">Request to join subject/section groups. Invite links are shared only after admin approval.</p>
      </div>

      {loading ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <SkeletonCard />
          <SkeletonList rows={3} />
        </div>
      ) : (
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-slate-800">Request to Join a Group</h2>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Select label="Group / Subject" required value={form.groupId} onChange={(e) => setForm({ ...form, groupId: e.target.value })}>
                <option value="">Select a group</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} — {g.subject}
                  </option>
                ))}
              </Select>
              <Input
                label="Phone Number"
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="9000000000"
              />
              <Textarea
                label="Reason"
                required
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                placeholder="Why do you need to join this group?"
              />
              <Button type="submit" className="w-full" loading={submitting}>
                <Send className="h-4 w-4" /> Submit Request
              </Button>
            </form>
          </CardBody>
        </Card>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 bg-emerald-600 px-5 py-3 text-white">
            <MessageCircle className="h-4 w-4" />
            <span className="text-sm font-semibold">My Requests</span>
          </div>
          {requests.length === 0 ? (
            <CardBody>
              <EmptyState icon={MessageCircle} title="No requests yet" description="Submit a request to join a group." />
            </CardBody>
          ) : (
            <StaggerContainer className="divide-y divide-slate-100">
              {requests.map((r) => (
                <StaggerItem key={r.id} className="flex items-center gap-3 p-4 transition-colors hover:bg-emerald-50/40">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-xs font-bold text-white">
                    {initials(r.group?.name ?? "?")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{r.group?.name}</p>
                    <p className="text-xs text-slate-400">{formatDate(r.createdAt)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge tone={STATUS_TONE[r.status]}>{titleCase(r.status)}</Badge>
                    {r.status === "APPROVED" && r.inviteLink && (
                      <a
                        href={r.inviteLink}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-800"
                      >
                        Join <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          )}
        </div>
      </div>
      )}
    </div>
  );
}
