import { useEffect, useState } from "react";
import { Star, CheckCircle2, MessageSquareText } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { EmptyState } from "../../components/ui/EmptyState";
import { SkeletonList } from "../../components/ui/Skeleton";
import { StaggerContainer, StaggerItem } from "../../components/motion/Stagger";
import { useToast } from "../../context/ToastContext";
import { getErrorMessage } from "../../services/api";
import { feedbackService } from "../../services/feedback.service";
import { FeedbackQuestion, FeedbackTarget } from "../../types";

const RATINGS = [1, 2, 3, 4, 5] as const;

function RatingRow({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (rating: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      {RATINGS.map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => onChange(r)}
          className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-bold transition-all ${
            value === r
              ? "border-gold-500 bg-gold-500 text-white shadow-sm"
              : "border-slate-300 text-slate-500 hover:border-gold-400 hover:text-gold-600"
          }`}
        >
          {r}
        </button>
      ))}
    </div>
  );
}

export default function StudentFacultyFeedback() {
  const [targets, setTargets] = useState<FeedbackTarget[]>([]);
  const [questions, setQuestions] = useState<FeedbackQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<FeedbackTarget | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  async function reload() {
    setLoading(true);
    try {
      const [t, q] = await Promise.all([feedbackService.myTargets(), feedbackService.listActiveQuestions()]);
      setTargets(t.targets);
      setQuestions(q);
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
    setActive(t);
    setAnswers({});
  }

  const allAnswered = questions.length > 0 && questions.every((q) => answers[q.id] !== undefined);

  async function handleSubmit() {
    if (!active || !allAnswered) return;
    setSubmitting(true);
    try {
      await feedbackService.submit({
        facultyId: active.facultyId,
        subjectId: active.subjectId,
        answers: questions.map((q) => ({ questionId: q.id, rating: answers[q.id] })),
      });
      toast.success("Feedback submitted successfully.");
      setActive(null);
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const pending = targets.filter((t) => !t.submitted);
  const submitted = targets.filter((t) => t.submitted);

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

      <Modal open={!!active} onClose={() => setActive(null)} title="Give Feedback" maxWidth="max-w-2xl">
        {active && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="font-semibold text-brand-950">{active.facultyName}</p>
              <p className="text-xs text-slate-500">
                {active.subjectName} &middot; {active.subjectCode}
              </p>
            </div>

            {questions.length === 0 ? (
              <p className="text-sm text-slate-500">There are no feedback questions configured yet.</p>
            ) : (
              <div className="space-y-4">
                {questions.map((q, i) => (
                  <div key={q.id} className="flex flex-col gap-2.5 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-medium text-slate-800">
                      {i + 1}. {q.text}
                    </p>
                    <RatingRow value={answers[q.id] ?? null} onChange={(r) => setAnswers((prev) => ({ ...prev, [q.id]: r }))} />
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <p className="text-xs text-slate-400">
                {Object.keys(answers).length} / {questions.length} answered
              </p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setActive(null)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={!allAnswered} loading={submitting}>
                  Submit Feedback
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
