import { useCallback, useEffect, useRef, useState } from "react";
import { AppNotification } from "../types";
import { notificationsService } from "../services/notifications.service";
import { useToast } from "../context/ToastContext";

const POLL_INTERVAL_MS = 30_000;

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const seenIds = useRef<Set<string> | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await notificationsService.list({ pageSize: 15 });

      if (seenIds.current) {
        // Skip the very first load (nothing "new" on initial mount) — only
        // toast for notifications that arrive on a later poll.
        const freshlyArrived = res.data.filter((n) => n.status === "UNREAD" && !seenIds.current!.has(n.id));
        for (const n of freshlyArrived) {
          toast.info(n.message, n.title);
        }
      }
      seenIds.current = new Set(res.data.map((n) => n.id));

      setNotifications(res.data);
      setUnreadCount(res.meta.unreadCount ?? 0);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  const markRead = useCallback(async (id: string) => {
    await notificationsService.markRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, status: "READ" } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    await notificationsService.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, status: "READ" })));
    setUnreadCount(0);
  }, []);

  return { notifications, unreadCount, loading, reload: load, markRead, markAllRead };
}
