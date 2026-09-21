import { useEffect, useState, FormEvent } from "react";
import { motion } from "framer-motion";
import { MessageCircle, Plus, ExternalLink, Copy, Check, Users2, Search, Hash } from "lucide-react";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/FormField";
import { Modal } from "../../components/ui/Modal";
import { EmptyState } from "../../components/ui/EmptyState";
import { SkeletonList } from "../../components/ui/Skeleton";
import { useToast } from "../../context/ToastContext";
import { getErrorMessage } from "../../services/api";
import { whatsappService } from "../../services/whatsapp.service";
import { WhatsAppGroup } from "../../types";

const emptyForm = { name: "", subject: "", department: "", year: "", section: "", inviteLink: "" };

export default function AdminWhatsAppGroups() {
  const [groups, setGroups] = useState<WhatsAppGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const toast = useToast();

  const filteredGroups = groups.filter((g) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return g.name.toLowerCase().includes(q) || g.subject.toLowerCase().includes(q);
  });

  function copyLink(g: WhatsAppGroup) {
    if (!g.inviteLink) return;
    navigator.clipboard.writeText(g.inviteLink);
    setCopiedId(g.id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  async function load() {
    setLoading(true);
    try {
      setGroups(await whatsappService.listGroups());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await whatsappService.createGroup({
        ...form,
        year: form.year ? Number(form.year) : undefined,
      });
      toast.success("Group created");
      setModalOpen(false);
      setForm(emptyForm);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">WhatsApp Groups</h1>
          <p className="text-sm text-slate-500">Manage subject and section groups students can request to join.</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" /> New Group
        </Button>
      </div>

      {!loading && groups.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-700">
            <Users2 className="h-3.5 w-3.5" /> {groups.length} groups
          </div>
          <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3.5 py-1.5 text-xs font-semibold text-slate-600">
            {groups.filter((g) => g.isActive).length} active
          </div>
          <div className="relative ml-auto max-w-xs flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search groups..."
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
          </div>
        </div>
      )}

      {loading ? (
        <SkeletonList rows={4} />
      ) : groups.length === 0 ? (
        <EmptyState icon={MessageCircle} title="No groups yet" />
      ) : filteredGroups.length === 0 ? (
        <EmptyState icon={Search} title="No groups match your search" />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 bg-emerald-600 px-5 py-3 text-white">
            <Users2 className="h-4 w-4" />
            <span className="text-sm font-semibold">Group Directory</span>
          </div>
          <div className="divide-y divide-slate-100">
            {filteredGroups.map((g, i) => (
              <motion.div
                key={g.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.04 }}
                className="flex items-center gap-3 p-4 transition-colors hover:bg-emerald-50/50"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-sm">
                  <Hash className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-slate-800">{g.name}</p>
                    <Badge tone={g.isActive ? "green" : "slate"}>{g.isActive ? "Active" : "Inactive"}</Badge>
                  </div>
                  <p className="truncate text-xs text-slate-500">{g.subject}</p>
                  <p className="truncate text-[11px] text-slate-400">
                    {g.department ?? "All departments"}
                    {g.year ? ` · Year ${g.year}` : ""}
                    {g.section ? ` - ${g.section}` : ""}
                  </p>
                </div>
                {g.inviteLink && (
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => copyLink(g)}
                      className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-emerald-600"
                      title="Copy invite link"
                    >
                      {copiedId === g.id ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                    </button>
                    <a
                      href={g.inviteLink}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full p-2 text-emerald-600 hover:bg-emerald-100"
                      title="Open invite link"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New WhatsApp Group">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Group Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="DCME 2nd Year Section A" />
          <Input label="Subject" required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Database Management Systems" />
          <div className="grid grid-cols-3 gap-4">
            <Input label="Department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="DCME" />
            <Input label="Year" type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
            <Input label="Section" value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value.toUpperCase() })} />
          </div>
          <Input
            label="Invite Link"
            required
            type="url"
            value={form.inviteLink}
            onChange={(e) => setForm({ ...form, inviteLink: e.target.value })}
            placeholder="https://chat.whatsapp.com/..."
          />
          <p className="text-xs text-slate-400">This link is private — it's only revealed to students whose join request is approved.</p>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Create Group
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
