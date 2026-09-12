import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ClipboardList,
  Users,
  GraduationCap,
  Megaphone,
  BookOpen,
  MessageCircle,
  Search,
  CalendarClock,
  Settings,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { usePaginatedList } from "../../hooks/usePaginatedList";
import { auditService } from "../../services/audit.service";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Pagination } from "../../components/ui/Pagination";
import { Skeleton } from "../../components/ui/Skeleton";
import { formatDate, titleCase } from "../../utils/format";
import { groupByDay } from "../../utils/dateGroups";
import { AuditLog } from "../../types";

const CATEGORY_META: Record<string, { icon: typeof Users; label: string; tone: string }> = {
  STUDENT: { icon: Users, label: "Students", tone: "text-brand-400" },
  FACULTY: { icon: GraduationCap, label: "Faculty", tone: "text-gold-400" },
  NOTICE: { icon: Megaphone, label: "Notices", tone: "text-brand-400" },
  ACADEMIC: { icon: BookOpen, label: "Academic Updates", tone: "text-emerald-400" },
  WHATSAPP: { icon: MessageCircle, label: "WhatsApp", tone: "text-green-400" },
  LOST: { icon: Search, label: "Lost & Found", tone: "text-amber-400" },
  TIMETABLE: { icon: CalendarClock, label: "Timetable", tone: "text-brand-400" },
  SETTING: { icon: Settings, label: "Settings", tone: "text-slate-400" },
  USER: { icon: ShieldCheck, label: "Accounts", tone: "text-maroon-400" },
};
const DEFAULT_CATEGORY = { icon: Upload, label: "Other", tone: "text-slate-400" };

function categoryOf(action: string): string {
  return action.split("_")[0] ?? "OTHER";
}

function actionColor(action: string): string {
  if (action.includes("DELETE") || action.includes("DEACTIVATED") || action.includes("REJECTED")) return "text-red-400";
  if (action.includes("CREATE") || action.includes("IMPORTED") || action === "USER_ACTIVATED" || action.includes("APPROVED")) return "text-emerald-400";
  if (action.includes("UPDATE") || action.includes("RESET") || action.includes("MODERAT")) return "text-gold-300";
  if (action.includes("LOGIN") || action.includes("AUTH")) return "text-brand-300";
  return "text-slate-300";
}

export default function AdminAuditLogs() {
  const { items, meta, page, setPage, loading } = usePaginatedList<AuditLog>(auditService.list);
  const [category, setCategory] = useState("");

  const categories = useMemo(() => Array.from(new Set(items.map((log) => categoryOf(log.action)))), [items]);
  const filtered = category ? items.filter((log) => categoryOf(log.action) === category) : items;
  const groups = groupByDay(filtered, (log) => log.createdAt);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Audit Logs</h1>
        <p className="text-sm text-slate-500">A record of sensitive administrative actions across the system.</p>
      </div>

      {!loading && categories.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCategory("")}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
              !category ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All
          </button>
          {categories.map((c) => {
            const meta = CATEGORY_META[c] ?? DEFAULT_CATEGORY;
            return (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold ${
                  category === c ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <meta.icon className="h-3.5 w-3.5" /> {meta.label}
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="space-y-2 rounded-2xl border border-slate-800 bg-[#0b1220] p-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full bg-slate-800" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No audit activity yet" />
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#0b1220] shadow-lg">
            <div className="flex items-center gap-1.5 border-b border-slate-800 bg-[#111a2e] px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
              <span className="h-2.5 w-2.5 rounded-full bg-gold-500" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="ml-3 font-mono text-xs text-slate-400">system-audit.log</span>
              <span className="ml-auto font-mono text-[11px] text-slate-600">{filtered.length} entries</span>
            </div>
            <div className="max-h-[36rem] overflow-y-auto p-4 text-xs leading-relaxed sm:text-[13px]">
              {groups.map(([label, group]) => (
                <div key={label} className="mb-4 last:mb-0">
                  <p className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-slate-600">{label}</p>
                  {group.map((log, i) => {
                    const cat = CATEGORY_META[categoryOf(log.action)] ?? DEFAULT_CATEGORY;
                    return (
                      <motion.div
                        key={log.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2, delay: Math.min(i * 0.02, 0.4) }}
                        className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 border-b border-slate-800/60 py-1.5 font-mono last:border-0"
                      >
                        <cat.icon className={`h-3.5 w-3.5 shrink-0 ${cat.tone}`} />
                        <span className="shrink-0 text-slate-500">{formatDate(log.createdAt, "HH:mm:ss")}</span>
                        <span className={`shrink-0 font-bold ${actionColor(log.action)}`}>{titleCase(log.action)}</span>
                        <span className="text-slate-600">by</span>
                        <span className="text-brand-300">{log.user?.email ?? "system"}</span>
                        {log.targetType && (
                          <>
                            <span className="text-slate-600">&rarr;</span>
                            <span className="text-gold-300">
                              {log.targetType}
                              {log.targetId ? `#${log.targetId.slice(0, 8)}` : ""}
                            </span>
                          </>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              ))}
              <div className="flex items-center gap-1 text-slate-600">
                <span>$</span>
                <span className="h-3.5 w-1.5 animate-pulse bg-slate-500" />
              </div>
            </div>
          </div>
          <Card>
            <Pagination meta={{ ...meta, page }} onPageChange={setPage} />
          </Card>
        </>
      )}
    </div>
  );
}
