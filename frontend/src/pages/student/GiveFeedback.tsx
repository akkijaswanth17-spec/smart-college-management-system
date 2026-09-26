import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, MessageSquareText } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Textarea } from "../../components/ui/FormField";
import { EmptyState } from "../../components/ui/EmptyState";
import { SkeletonList } from "../../components/ui/Skeleton";
import { useToast } from "../../context/ToastContext";
import { getErrorMessage } from "../../services/api";
import { feedbackService } from "../../services/feedback.service";
import { FeedbackQuestion, FeedbackTarget } from "../../types";

const RATINGS = [1, 2, 3, 4, 5] as const;

function RatingRow({ value, onChange }: { value: number | null; onChange: (rating: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      {RATINGS.map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => onChange(r)}
          className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold transition-all ${
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

// Full-page rating form for one faculty/subject, opened from the Faculty Feedback list.
export default function StudentGiveFeedback() {
  const { facultyId, subjectId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [target, setTarget] = useState<FeedbackTarget | null>(null);
  const [questions, setQuestions] = useState<FeedbackQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [t, q] = await Promise.all([feedbackService.myTargets(), feedbackService.listActiveQuestions()]);
        setTarget(t.targets.find((x) => x.facultyId === facultyId && x.subjectId === subjectId) ?? null);
        setQuestions(q);
      } catch (err) {
        toast.error(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facultyId, subjectId]);

  const answeredCount = questions.filter((q) => answers[q.id] !== undefined).length;
  const allAnswered = questions.length > 0 && answeredCount === questions.length;

  async function handleSubmit() {
    if (!target || !allAnswered) return;
    setSubmitting(true);
    try {
      await feedbackService.submit({
        facultyId: target.facultyId,
        subjectId: target.subjectId,
        answers: questions.map((q) => ({ questionId: q.id, rating: answers[q.id] })),
        comment: comment.trim() || undefined,
      });
      toast.success("Feedback submitted successfully.");
      navigate("/student/feedback", { replace: true });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-8 sm:py-10">
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        to="/student/feedback"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-brand-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Faculty Feedback
      </Link>

      {loading ? (
        <SkeletonList rows={6} />
      ) : !target ? (
        <EmptyState
          icon={MessageSquareText}
          title="Feedback form not found"
          description="This faculty/subject isn't in your timetable. Go back and pick one from the list."
        />
      ) : target.submitted ? (
        <EmptyState
          icon={CheckCircle2}
          title="Feedback already submitted"
          description={`You've already given feedback for ${target.facultyName} (${target.subjectName}). Thank you!`}
        />
      ) : (
        <>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Give Feedback</h1>
            <p className="text-sm text-slate-500">Rate each statement from 1 (poor) to 5 (excellent).</p>
          </div>

          <Card className="p-5">
            <p className="text-lg font-semibold text-brand-950">{target.facultyName}</p>
            <p className="text-sm text-slate-500">
              {target.subjectName} &middot; {target.subjectCode}
            </p>
          </Card>

          {questions.length === 0 ? (
            <p className="text-sm text-slate-500">There are no feedback questions configured yet.</p>
          ) : (
            <div className="space-y-3">
              {questions.map((q, i) => (
                <div
                  key={q.id}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <p className="text-sm font-medium text-slate-800">
                    {i + 1}. {q.text}
                  </p>
                  <RatingRow value={answers[q.id] ?? null} onChange={(r) => setAnswers((prev) => ({ ...prev, [q.id]: r }))} />
                </div>
              ))}
            </div>
          )}

          <Textarea
            label="Suggestion / Feedback (optional)"
            placeholder="Anything else you'd like to share about this faculty member?"
            rows={4}
            maxLength={1000}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />

          <div className="sticky bottom-0 -mx-1 flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/95 px-1 py-4 backdrop-blur">
            <p className="text-sm text-slate-500">
              {answeredCount} / {questions.length} answered
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => navigate("/student/feedback")}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={!allAnswered} loading={submitting}>
                Submit Feedback
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
    </div>
  );
}
