import { useState, FormEvent } from "react";
import { KeyRound } from "lucide-react";
import { Input } from "./ui/FormField";
import { Button } from "./ui/Button";
import { useToast } from "../context/ToastContext";
import { getErrorMessage } from "../services/api";
import { changePassword } from "../services/auth.service";

export function ChangePasswordForm({ onSuccess }: { onSuccess?: () => void } = {}) {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await changePassword(form.currentPassword, form.newPassword, form.confirmPassword);
      toast.success("Password updated successfully");
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      onSuccess?.();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Current Password"
        type="password"
        required
        value={form.currentPassword}
        onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
      />
      <Input
        label="New Password"
        type="password"
        required
        value={form.newPassword}
        onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
      />
      <Input
        label="Confirm New Password"
        type="password"
        required
        value={form.confirmPassword}
        onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
      />
      <Button type="submit" loading={loading}>
        <KeyRound className="h-4 w-4" /> Update Password
      </Button>
    </form>
  );
}
