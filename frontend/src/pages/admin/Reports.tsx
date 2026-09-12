import { IdCard, GraduationCap, Users } from "lucide-react";
import { ReportAccordion } from "../../components/reports/ReportAccordion";
import { StudentDetailsReport } from "../../components/reports/StudentDetailsReport";
import { StudentMarksReport } from "../../components/reports/StudentMarksReport";
import { FacultyDetailsReport } from "../../components/reports/FacultyDetailsReport";

export default function AdminReports() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-xl font-bold text-brand-950">Reports</h1>
        <p className="text-sm text-slate-500">Generate, preview and export official college reports.</p>
      </div>

      <div className="space-y-4">
        <ReportAccordion title="Student Details" icon={IdCard} defaultOpen>
          <StudentDetailsReport />
        </ReportAccordion>

        <ReportAccordion title="Student Marks" icon={GraduationCap}>
          <StudentMarksReport />
        </ReportAccordion>

        <ReportAccordion title="Faculty Details" icon={Users}>
          <FacultyDetailsReport />
        </ReportAccordion>
      </div>
    </div>
  );
}
