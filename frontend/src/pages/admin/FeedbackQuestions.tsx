import { useEffect, useState, FormEvent } from "react";
import { ListChecks, Plus, Pencil, Trash2, GripVertical, ArrowUp, ArrowDown } from "lucide-react";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/FormField";
import { Modal } from "../../components/ui/Modal";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { EmptyState } from "../../components/ui/EmptyState";
import { SkeletonList } from "../../components/ui/Skeleton";
import { useToast } from "../../context/ToastContext";
import { getErrorMessage } from "../../services/api";
import { feedbackService } from "../../services/feedback.service";
import { FeedbackQuestion } from "../../types";

export function FeedbackQuestions() {
  const [questions, setQuestions] = useState<FeedbackQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FeedbackQuestion | null>(null);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FeedbackQuestion | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [reordering, setReordering] = useState(false);
  const toast = useToast();

  async function reload() {
    setLoading(true);
    try {
      setQuestions(await feedbackService.listQuestions());
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

  function openCreate() {
    setEditing(null);
    setText("");
    setModalOpen(true);
  }

  function openEdit(q: FeedbackQuestion) {
    setEditing(q);
    setText(q.text);
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await feedbackService.updateQuestion(editing.id, { text: text.trim() });
        toast.success("Question updated");
      } else {
        await feedbackService.createQuestion({ text: text.trim() });
        toast.success("Question added");
      }
      setModalOpen(false);
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(q: FeedbackQuestion) {
    try {
      await feedbackService.updateQuestion(q.id, { isActive: !q.isActive });
      setQuestions((prev) => prev.map((p) => (p.id === q.id ? { ...p, isActive: !p.isActive } : p)));
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await feedbackService.deleteQuestion(deleteTarget.id);
      toast.success("Question deleted");
      setDeleteTarget(null);
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= questions.length) return;
    const reordered = [...questions];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    setQuestions(reordered);
    setReordering(true);
    try {
      await feedbackService.reorderQuestions(reordered.map((q) => q.id));
    } catch (err) {
      toast.error(getErrorMessage(err));
      reload();
    } finally {
      setReordering(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-brand-600" />
            <h2 className="font-semibold text-slate-800">Feedback Questions</h2>
          </div>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Question
          </Button>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Every ACTIVE question here is asked for each faculty/subject a student submits feedback for. Reorder with the
          arrows — the order here is the order students see them in.
        </p>
      </CardHeader>
      <CardBody>
        {loading ? (
          <SkeletonList rows={6} />
        ) : questions.length === 0 ? (
          <EmptyState icon={ListChecks} title="No questions yet" description="Add your first feedback question above." />
        ) : (
          <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200">
            {questions.map((q, i) => (
              <div key={q.id} className="flex items-center gap-3 bg-white px-4 py-3">
                <GripVertical className="h-4 w-4 shrink-0 text-slate-300" />
                <div className="flex shrink-0 flex-col">
                  <button
                    onClick={() => move(i, -1)}
                    disabled={i === 0 || reordering}
                    className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-brand-700 disabled:opacity-30"
                    aria-label="Move up"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => move(i, 1)}
                    disabled={i === questions.length - 1 || reordering}
                    className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-brand-700 disabled:opacity-30"
                    aria-label="Move down"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium ${q.isActive ? "text-slate-800" : "text-slate-400 line-through"}`}>
                    {q.text}
                  </p>
                </div>
                <label className="flex shrink-0 items-center gap-2 text-xs font-semibold text-slate-500">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-brand-700"
                    checked={q.isActive}
                    onChange={() => toggleActive(q)}
                  />
                  Active
                </label>
                <button
                  onClick={() => openEdit(q)}
                  className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-brand-50 hover:text-brand-700"
                  aria-label="Edit question"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setDeleteTarget(q)}
                  className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  aria-label="Delete question"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </CardBody>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Question" : "Add Question"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Question Text"
            required
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. Teacher comes to Class on time"
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving} disabled={!text.trim()}>
              {editing ? "Save Changes" : "Add Question"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete question?"
        message={`"${deleteTarget?.text}" will be permanently removed. If it already has feedback responses, disable it instead.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Card>
  );
}

export default FeedbackQuestions;
