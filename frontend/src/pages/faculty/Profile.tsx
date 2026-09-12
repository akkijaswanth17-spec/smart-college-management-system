import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { AvatarUploadButton } from "../../components/AvatarUploadButton";
import { ChangePasswordForm } from "../../components/ChangePasswordForm";
import { StaggerContainer, StaggerItem } from "../../components/motion/Stagger";
import { useAuth } from "../../context/AuthContext";

export default function FacultyProfile() {
  const { user } = useAuth();
  const faculty = user?.faculty;
  if (!faculty) return null;

  return (
    <StaggerContainer className="mx-auto max-w-2xl space-y-6">
      <StaggerItem>
        <Card>
          <CardHeader className="flex items-center gap-3">
            <AvatarUploadButton size="h-14 w-14" tone="gold" ringed />
            <div>
              <h1 className="font-semibold text-slate-900">{faculty.fullName}</h1>
              <p className="text-sm text-slate-500">{user?.email}</p>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-400">Faculty ID</p>
                <p className="font-medium text-slate-800">{faculty.facultyId}</p>
              </div>
              <div>
                <p className="text-slate-400">Department</p>
                <p className="font-medium text-slate-800">{faculty.department?.name}</p>
              </div>
              <div>
                <p className="text-slate-400">Designation</p>
                <p className="font-medium text-slate-800">{faculty.designation}</p>
              </div>
              <div>
                <p className="text-slate-400">Phone</p>
                <p className="font-medium text-slate-800">{faculty.phone}</p>
              </div>
              <div>
                <p className="text-slate-400">Status</p>
                <Badge tone={faculty.status === "ACTIVE" ? "green" : "red"}>{faculty.status}</Badge>
              </div>
            </div>
            <p className="border-t border-slate-100 pt-4 text-xs text-slate-400">
              To update contact or department details, please contact the college administration.
            </p>
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
