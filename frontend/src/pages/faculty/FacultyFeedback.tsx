import { useEffect, useState } from "react";
import { MessageSquareText, Eye } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { SkeletonList } from "../../components/ui/Skeleton";
import { ReportPreview } from "../../components/reports/ReportPreview";
import { FeedbackDetailReport } from "../../components/feedback/FeedbackDetailReport";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import { getErrorMessage } from "../../services/api";
import { getDisplayName } from "../../utils/displayName";
import { feedbackService } from "../../services/feedback.service";
import { generateFacultyFeedbackReportPdf } from "../../utils/reportPdf";
import { FeedbackFacultyDetail } from "../../types";

export default function FacultyFeedbackPage() {
  const [items, setItems] = useState<FeedbackFacultyDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<FeedbackFacultyDetail | null>(null);
  const [downloading, setDownloading] = useState(false);
  const toast = useToast();
  const { user } = useAuth();

  useEffect(() => {
    feedbackService
      .myFeedback()
      .then(setItems)
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDownload() {
    if (!active) return;
    setDownloading(true);
    try {
      await generateFacultyFeedbackReportPdf(active, getDisplayName(user));
      toast.success("Report generated successfully.");
    } catch {
      toast.error("Unable to generate the report. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Faculty Feedback</h1>
        <p className="text-sm text-slate-500">Feedback students submitted for your subjects, once the college publishes it.</p>
      </div>

      {loading ? (
        <SkeletonList rows={4} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={MessageSquareText}
          title="No published feedback yet"
          description="Once the college publishes student feedback for your subjects, it will appear here."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((item) => {
            const key = `${item.facultyId}:${item.subjectId}:${item.academicYear}`;
            return (
              <Card key={key} className="flex flex-col gap-4 p-5">
                <div>
                  <p className="font-serif font-semibold text-brand-950">{item.subjectName}</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {item.departmentName} &middot; Year {item.year} - {item.section} &middot; A.Y. {item.academicYear}
                  </p>
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <p className="font-serif text-lg font-bold text-brand-950">{item.percentage.toFixed(2)}%</p>
                  <Button variant="outline" size="sm" onClick={() => setActive(item)}>
                    <Eye className="h-3.5 w-3.5" /> View Report
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {active && (
        <ReportPreview
          open={!!active}
          onClose={() => setActive(null)}
          reportTitle={`Feedback Analysis Report : ${active.departmentCode}-${active.section} ${active.year} Sem`}
          titleBadge={active.academicYear}
          generatedBy={getDisplayName(user)}
          onDownload={handleDownload}
          downloading={downloading}
        >
          <FeedbackDetailReport detail={active} />
        </ReportPreview>
      )}
    </div>
  );
}
