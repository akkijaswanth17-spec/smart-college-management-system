import { useState, FormEvent } from "react";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { AvatarUploadButton } from "../../components/AvatarUploadButton";
import { Input } from "../../components/ui/FormField";
import { Button } from "../../components/ui/Button";
import { ChangePasswordForm } from "../../components/ChangePasswordForm";
import { StaggerContainer, StaggerItem } from "../../components/motion/Stagger";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { getErrorMessage } from "../../services/api";
import { adminService } from "../../services/admin.service";

export default function AdminProfile() {
  const { user, refresh } = useAuth();
  const [fullName, setFullName] = useState(user?.admin?.fullName ?? "");
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) return;
    setSaving(true);
    try {
      await adminService.updateSelf({ fullName: fullName.trim() });
      toast.success("Profile updated");
      await refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <StaggerContainer className="mx-auto max-w-2xl space-y-6">
      <StaggerItem>
        <Card>
          <CardHeader className="flex items-center gap-3">
            <AvatarUploadButton size="h-14 w-14" tone="maroon" ringed />
            <div>
              <h1 className="font-semibold text-slate-900">{user?.admin?.fullName || "Administrator"}</h1>
              <p className="text-sm text-slate-500">{user?.email}</p>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            <form onSubmit={handleSave} className="flex items-end gap-3 border-t border-slate-100 pt-4">
              <div className="flex-1">
                <Input label="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <Button type="submit" loading={saving}>
                Save
              </Button>
            </form>
          </CardBody>
        </Card>
      </StaggerItem>

      <StaggerItem>
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-slate-800">Change Password</h2>
          </CardHeader>
          <CardBody>
            <ChangePasswordForm />
          </CardBody>
        </Card>
      </StaggerItem>
    </StaggerContainer>
  );
}
