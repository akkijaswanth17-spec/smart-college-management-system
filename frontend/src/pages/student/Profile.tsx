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
import { studentsService } from "../../services/students.service";

export default function StudentProfile() {
  const { user, refresh } = useAuth();
  const student = user?.student;
  const [phone, setPhone] = useState(student?.phone ?? "");
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  if (!student) return null;

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await studentsService.update(student!.id, { phone });
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
            <AvatarUploadButton size="h-14 w-14" tone="brand" ringed />
            <div>
              <h1 className="font-semibold text-slate-900">{student.fullName}</h1>
              <p className="text-sm text-slate-500">{user?.email}</p>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-400">Student ID</p>
                <p className="font-medium text-slate-800">{student.studentId}</p>
              </div>
              <div>
                <p className="text-slate-400">Department</p>
                <p className="font-medium text-slate-800">{student.department?.name}</p>
              </div>
              <div>
                <p className="text-slate-400">Year</p>
                <p className="font-medium text-slate-800">Year {student.year}</p>
              </div>
              <div>
                <p className="text-slate-400">Section</p>
                <p className="font-medium text-slate-800">{student.section}</p>
              </div>
            </div>
            <form onSubmit={handleSave} className="flex items-end gap-3 border-t border-slate-100 pt-4">
              <div className="flex-1">
                <Input label="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} />
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
