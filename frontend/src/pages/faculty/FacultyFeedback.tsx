import { useEffect, useState } from "react";
import { MessageSquareText, FileDown } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { SkeletonList } from "../../components/ui/Skeleton";
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
  const [downloading, setDownloading] = useState<string | null>(null);
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

  async function handleDownload(item: FeedbackFacultyDetail) {
    const key = `${item.facultyId}:${item.subjectId}:${item.academicYear}`;
    setDownloading(key);
    try {
      await generateFacultyFeedbackReportPdf(item, getDisplayName(user));
    } catch {
      toast.error("Unable to generate the report. Please try again.");
    } finally {
      setDownloading(null);
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
        <div className="space-y-6">
          {items.map((item) => {
            const key = `${item.facultyId}:${item.subjectId}:${item.academicYear}`;
            return (
              <Card key={key} className="overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                  <div>
                    <p className="font-serif font-semibold text-brand-950">
                      {item.subjectName} &middot; {item.departmentName} · Year {item.year} - {item.section}
                    </p>
                    <p className="text-xs text-slate-400">Academic Year {item.academicYear}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleDownload(item)} loading={downloading === key}>
                    <FileDown className="h-3.5 w-3.5" /> Download
                  </Button>
                </div>
                <div className="p-5">
                  <FeedbackDetailReport detail={item} />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
