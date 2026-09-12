import { motion, AnimatePresence } from "framer-motion";
import { Bell, CheckCheck, CalendarClock, Megaphone, BookOpen, MessageCircle, Info } from "lucide-react";
import { useNotifications } from "../../hooks/useNotifications";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { SkeletonList } from "../../components/ui/Skeleton";
import { StaggerContainer, StaggerItem } from "../../components/motion/Stagger";
import { EnableNotificationsButton } from "../../components/EnableNotificationsButton";
import { formatDistanceToNow } from "date-fns";
import { groupByDay } from "../../utils/dateGroups";
import { NotificationType } from "../../types";

const ICONS: Record<NotificationType, typeof Bell> = {
  CLASS_REMINDER: CalendarClock,
  NOTICE: Megaphone,
  ACADEMIC_UPDATE: BookOpen,
  WHATSAPP_REQUEST: MessageCircle,
  SYSTEM: Info,
};

const ICON_TONE: Record<NotificationType, string> = {
  CLASS_REMINDER: "bg-gold-50 text-gold-600",
  NOTICE: "bg-brand-50 text-brand-600",
  ACADEMIC_UPDATE: "bg-emerald-50 text-emerald-600",
  WHATSAPP_REQUEST: "bg-green-50 text-green-600",
  SYSTEM: "bg-slate-100 text-slate-500",
};

export function NotificationsPage() {
  const { notifications, unreadCount, loading, markRead, markAllRead } = useNotifications();
  const groups = groupByDay(notifications, (n) => n.createdAt);

  return (
    <div className="space-y-6">
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div>
          <h1 className="text-xl font-bold text-slate-900">Notifications</h1>
          <p className="text-sm text-slate-500">Class reminders, notices and updates relevant to you.</p>
        </div>
        <div className="flex items-center gap-2">
          <EnableNotificationsButton />
          {unreadCount > 0 && (
            <Button variant="outline" onClick={markAllRead}>
              <CheckCheck className="h-4 w-4" /> Mark all read
            </Button>
          )}
        </div>
      </motion.div>

      {loading ? (
        <SkeletonList rows={6} />
      ) : notifications.length === 0 ? (
        <EmptyState icon={Bell} title="You're all caught up" description="No notifications yet." />
      ) : (
        <div className="space-y-5">
          {groups.map(([label, group]) => (
            <div key={label}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
              <StaggerContainer className="space-y-2">
                <AnimatePresence initial={false}>
                  {group.map((n) => {
                    const Icon = ICONS[n.type] ?? Info;
                    return (
                      <StaggerItem key={n.id}>
                        <motion.button
                          layout
                          onClick={() => n.status === "UNREAD" && markRead(n.id)}
                          className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                            n.status === "UNREAD" ? "border-brand-100 bg-brand-50/40" : "border-slate-200 bg-white"
                          }`}
                        >
                          <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${ICON_TONE[n.type] ?? "bg-slate-100 text-slate-500"}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-800">{n.title}</p>
                            <p className="mt-0.5 whitespace-pre-line text-sm text-slate-600">{n.message}</p>
                            <p className="mt-1 text-xs text-slate-400">
                              {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                          {n.status === "UNREAD" && (
                            <motion.span
                              layoutId={`dot-${n.id}`}
                              className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500"
                            />
                          )}
                        </motion.button>
                      </StaggerItem>
                    );
                  })}
                </AnimatePresence>
              </StaggerContainer>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
