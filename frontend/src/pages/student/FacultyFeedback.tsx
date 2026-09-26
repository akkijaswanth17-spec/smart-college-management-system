import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Star, CheckCircle2, MessageSquareText, Send } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { SkeletonList } from "../../components/ui/Skeleton";
import { StaggerContainer, StaggerItem } from "../../components/motion/Stagger";
import { useToast } from "../../context/ToastContext";
import { getErrorMessage } from "../../services/api";
import { feedbackService } from "../../services/feedback.service";
import { FeedbackTarget } from "../../types";

export default function StudentFacultyFeedback() {
  const [targets, setTargets] = useState<FeedbackTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(true);
  const toast = useToast();
  const navigate = useNavigate();

  async function reload() {
    setLoading(true);
    try {
      const [t, isEnabled] = await Promise.all([feedbackService.myTargets(), feedbackService.getEnabled()]);
      setTargets(t.targets);
      setEnabled(isEnabled);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openTarget(t: FeedbackTarget) {
    navigate(`/student/feedback/${t.facultyId}/${t.subjectId}`);
  }

  const pending = targets.filter((t) => !t.submitted);
  const submitted = targets.filter((t) => t.submitted);
  const allSubmitted = targets.length > 0 && pending.length === 0;

  function handleOverallSubmit() {
    if (!allSubmitted) return;
    toast.success("All feedback submitted successfully. Thank you!");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Faculty Feedback</h1>
        <p className="text-sm text-slate-500">
          Give feedback for your faculty members based on your timetable — one rating form per faculty/subject.
        </p>
      </div>

      {loading ? (
        <SkeletonList rows={5} />
      ) : !enabled ? (
        <EmptyState
          icon={MessageSquareText}
          title="Faculty Feedback is currently unavailable"
          description="This feature has been turned off by the college administration. Please check back later."
        />
      ) : targets.length === 0 ? (
        <EmptyState
          icon={MessageSquareText}
          title="No faculty to rate yet"
          description="Feedback targets are derived from your timetable — check back once your class schedule is set up."
        />
      ) : (
        <StaggerContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...pending, ...submitted].map((t) => (
            <StaggerItem key={`${t.facultyId}-${t.subjectId}`}>
              <Card className="flex h-full flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold-50 text-gold-600">
                    <Star className="h-4.5 w-4.5" />
                  </span>
                  <Badge tone={t.submitted ? "green" : "amber"}>{t.submitted ? "✓ Submitted" : "Pending Feedback"}</Badge>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-800">{t.facultyName}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-400">
                    {t.subjectName} &middot; {t.subjectCode}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={t.submitted ? "outline" : "primary"}
                  disabled={t.submitted}
                  onClick={() => openTarget(t)}
                  className="mt-1 w-full"
                >
                  {t.submitted ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" /> Completed
                    </>
                  ) : (
                    "Give Feedback"
                  )}
                </Button>
              </Card>
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}

      {!loading && enabled && targets.length > 0 && (
        <div
          className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl border px-5 py-4 ${
            allSubmitted ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"
          }`}
        >
          <div>
            <p className="font-serif font-semibold text-brand-950">
              {allSubmitted ? "All faculty feedback completed" : `${pending.length} Feedback${pending.length === 1 ? "" : "s"} Pending`}
            </p>
            <p className="text-xs text-slate-500">
              {allSubmitted
                ? "You've given feedback for every faculty member — thank you."
                : "Give feedback for every faculty member above to enable Overall Submit."}
            </p>
          </div>
          <Button onClick={handleOverallSubmit} disabled={!allSubmitted} size="lg">
            <Send className="h-4 w-4" /> Overall Submit
          </Button>
        </div>
      )}
    </div>
  );
}
