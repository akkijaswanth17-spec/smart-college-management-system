import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { Button } from "./ui/Button";
import { useToast } from "../context/ToastContext";
import { getErrorMessage } from "../services/api";
import { enablePushNotifications, disablePushNotifications, getPushStatus, PushStatus } from "../services/push.service";

export function EnableNotificationsButton({ size = "sm" }: { size?: "sm" | "md" | "lg" }) {
  const [status, setStatus] = useState<PushStatus | "loading">("loading");
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  useEffect(() => {
    getPushStatus().then(setStatus);
  }, []);

  async function handleEnable() {
    setBusy(true);
    try {
      const result = await enablePushNotifications();
      if (result.ok) {
        setStatus("subscribed");
        toast.success("Notifications enabled on this device");
      } else {
        toast.error(result.reason ?? "Couldn't enable notifications");
        setStatus(await getPushStatus());
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
      setStatus(await getPushStatus().catch(() => "not-subscribed"));
    } finally {
      setBusy(false);
    }
  }

  async function handleDisable() {
    setBusy(true);
    try {
      await disablePushNotifications();
      setStatus("not-subscribed");
      toast.success("Notifications disabled on this device");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (status === "loading" || status === "unsupported") return null;

  if (status === "denied") {
    return <p className="text-xs text-slate-400">Notifications are blocked — allow them in your browser's site settings.</p>;
  }

  if (status === "subscribed") {
    return (
      <Button variant="outline" size={size} onClick={handleDisable} loading={busy}>
        <BellOff className="h-4 w-4" /> Disable Notifications
      </Button>
    );
  }

  return (
    <Button size={size} onClick={handleEnable} loading={busy}>
      <Bell className="h-4 w-4" /> Enable Notifications
    </Button>
  );
}
