import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { ProtectedRoute } from "./components/ProtectedRoute";

import Landing from "./pages/public/Landing";
import StudentLogin from "./pages/public/StudentLogin";
import FacultyLogin from "./pages/public/FacultyLogin";
import AdminLogin from "./pages/public/AdminLogin";
import BranchLogin from "./pages/public/BranchLogin";
import NotFound from "./pages/public/NotFound";
import Forbidden from "./pages/public/Forbidden";
import Unauthorized from "./pages/public/Unauthorized";
import ServerError from "./pages/public/ServerError";
import ForceChangePassword from "./pages/public/ForceChangePassword";
import ForgotPassword from "./pages/public/ForgotPassword";
import PublicLostFound from "./pages/public/LostFound";

import StudentDashboardLayout from "./layouts/StudentDashboardLayout";
import StudentDashboard from "./pages/student/Dashboard";
import StudentTimetable from "./pages/student/Timetable";
import StudentNotices from "./pages/student/Notices";
import StudentAcademicUpdates from "./pages/student/AcademicUpdates";
import StudentLostFound from "./pages/student/LostFound";
import StudentFees from "./pages/student/Fees";
import StudentResults from "./pages/student/Results";
import StudentMarks from "./pages/student/Marks";
import StudentStudyMaterials from "./pages/student/StudyMaterials";
import StudentFacultyFeedback from "./pages/student/FacultyFeedback";
import StudentWhatsApp from "./pages/student/WhatsApp";
import StudentNotifications from "./pages/student/Notifications";
import StudentProfile from "./pages/student/Profile";

import FacultyDashboardLayout from "./layouts/FacultyDashboardLayout";
import FacultyDashboard from "./pages/faculty/Dashboard";
import FacultyTimetable from "./pages/faculty/Timetable";
import FacultyNextClass from "./pages/faculty/NextClass";
import FacultyNotices from "./pages/faculty/Notices";
import FacultyAcademicUpdates from "./pages/faculty/AcademicUpdates";
import FacultyLostFound from "./pages/faculty/LostFound";
import FacultyStudents from "./pages/faculty/Students";
import FacultyNotifications from "./pages/faculty/Notifications";
import FacultyProfile from "./pages/faculty/Profile";
import FacultyFeedback from "./pages/faculty/FacultyFeedback";

import AdminDashboardLayout from "./layouts/AdminDashboardLayout";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminStudents from "./pages/admin/Students";
import AdminFaculty from "./pages/admin/Faculty";
import AdminTimetable from "./pages/admin/Timetable";
import AdminTimetableImport from "./pages/admin/TimetableImport";
import AdminNotices from "./pages/admin/Notices";
import AdminAcademicUpdates from "./pages/admin/AcademicUpdates";
import AdminLostFound from "./pages/admin/LostFound";
import AdminWhatsAppGroups from "./pages/admin/WhatsAppGroups";
import AdminWhatsAppRequests from "./pages/admin/WhatsAppRequests";
import AdminLinksSettings from "./pages/admin/LinksSettings";
import AdminMarks from "./pages/admin/Marks";
import AdminAuditLogs from "./pages/admin/AuditLogs";
import AdminProfile from "./pages/admin/Profile";
import AdminBranchAccounts from "./pages/admin/BranchAccounts";
import AdminReports from "./pages/admin/Reports";
import AdminPromotions from "./pages/admin/Promotions";
import AdminStudyMaterials from "./pages/admin/StudyMaterials";
import AdminFeedbackQuestions from "./pages/admin/FeedbackQuestions";
import AdminFacultyFeedback from "./pages/admin/FacultyFeedback";

import BranchDashboardLayout from "./layouts/BranchDashboardLayout";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<StudentLogin />} />
            {/* Not linked from public nav — dedicated URLs shared directly by the college */}
            <Route path="/faculty/login" element={<FacultyLogin />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/branch/login" element={<BranchLogin />} />
            <Route path="/change-password" element={<ForceChangePassword />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/lost-found" element={<PublicLostFound />} />

            {/* Student */}
            <Route element={<ProtectedRoute allowedRoles={["STUDENT"]} />}>
              <Route path="/student" element={<StudentDashboardLayout />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<StudentDashboard />} />
                <Route path="timetable" element={<StudentTimetable />} />
                <Route path="notices" element={<StudentNotices />} />
                <Route path="academic-updates" element={<StudentAcademicUpdates />} />
                <Route path="lost-found" element={<StudentLostFound />} />
                <Route path="fees" element={<StudentFees />} />
                <Route path="results" element={<StudentResults />} />
                <Route path="marks" element={<StudentMarks />} />
                <Route path="study-materials" element={<StudentStudyMaterials />} />
                <Route path="feedback" element={<StudentFacultyFeedback />} />
                <Route path="whatsapp" element={<StudentWhatsApp />} />
                <Route path="notifications" element={<StudentNotifications />} />
                <Route path="profile" element={<StudentProfile />} />
              </Route>
            </Route>

            {/* Faculty */}
            <Route element={<ProtectedRoute allowedRoles={["FACULTY"]} />}>
              <Route path="/faculty" element={<FacultyDashboardLayout />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<FacultyDashboard />} />
                <Route path="timetable" element={<FacultyTimetable />} />
                <Route path="next-class" element={<FacultyNextClass />} />
                <Route path="notices" element={<FacultyNotices />} />
                <Route path="academic-updates" element={<FacultyAcademicUpdates />} />
                <Route path="lost-found" element={<FacultyLostFound />} />
                <Route path="students" element={<FacultyStudents />} />
                <Route path="feedback" element={<FacultyFeedback />} />
                <Route path="notifications" element={<FacultyNotifications />} />
                <Route path="profile" element={<FacultyProfile />} />
              </Route>
            </Route>

            {/* Admin */}
            <Route element={<ProtectedRoute allowedRoles={["ADMIN"]} />}>
              <Route path="/admin" element={<AdminDashboardLayout />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="students" element={<AdminStudents />} />
                <Route path="faculty" element={<AdminFaculty />} />
                <Route path="timetable" element={<AdminTimetable />} />
                <Route path="timetable/import" element={<AdminTimetableImport />} />
                <Route path="notices" element={<AdminNotices />} />
                <Route path="academic-updates" element={<AdminAcademicUpdates />} />
                <Route path="lost-found" element={<AdminLostFound />} />
                <Route path="whatsapp-groups" element={<AdminWhatsAppGroups />} />
                <Route path="whatsapp-requests" element={<AdminWhatsAppRequests />} />
                <Route path="settings" element={<AdminLinksSettings />} />
                <Route path="marks" element={<AdminMarks />} />
                <Route path="promotions" element={<AdminPromotions />} />
                <Route path="study-materials" element={<AdminStudyMaterials />} />
                <Route path="feedback-questions" element={<AdminFeedbackQuestions />} />
                <Route path="faculty-feedback" element={<AdminFacultyFeedback />} />
                <Route path="branch-accounts" element={<AdminBranchAccounts />} />
                <Route path="reports" element={<AdminReports />} />
                <Route path="audit-logs" element={<AdminAuditLogs />} />
                <Route path="profile" element={<AdminProfile />} />
              </Route>
            </Route>

            {/* Branch (department-scoped admin — HOD/coordinator) */}
            <Route element={<ProtectedRoute allowedRoles={["BRANCH"]} />}>
              <Route path="/branch" element={<BranchDashboardLayout />}>
                <Route index element={<Navigate to="students" replace />} />
                <Route path="students" element={<AdminStudents />} />
                <Route path="faculty" element={<AdminFaculty />} />
                <Route path="timetable" element={<AdminTimetable />} />
                <Route path="marks" element={<AdminMarks />} />
                <Route path="promotions" element={<AdminPromotions />} />
                <Route path="notices" element={<AdminNotices />} />
                <Route path="study-materials" element={<AdminStudyMaterials />} />
                <Route path="reports" element={<AdminReports />} />
              </Route>
            </Route>

            {/* Errors */}
            <Route path="/401" element={<Unauthorized />} />
            <Route path="/403" element={<Forbidden />} />
            <Route path="/500" element={<ServerError />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
