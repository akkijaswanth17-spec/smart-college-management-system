import { MessageSquareQuote } from "lucide-react";
import { FeedbackFacultyDetail } from "../../types";

/**
 * The detailed per-faculty/subject feedback breakdown — same markup used by
 * Admin's drill-down (Faculty-wise Feedback Analysis) and by Faculty's own
 * "my feedback" view, since both show exactly the same aggregated shape.
 */
export function FeedbackDetailReport({ detail }: { detail: FeedbackFacultyDetail }) {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-950 to-brand-900 px-6 py-5 text-center text-white">
        <p className="text-xs font-semibold uppercase tracking-wider text-gold-300">
          Feedback Analysis Report : {detail.departmentCode}-{detail.section} {detail.year} Sem
        </p>
        <p className="mt-1.5 font-serif text-lg font-bold">
          {detail.subjectName} - {detail.facultyName}
        </p>
        <p className="mt-1 text-xs text-brand-200">
          {detail.departmentName} &middot; Academic Year {detail.academicYear} &middot; {detail.submissionCount} response
          {detail.submissionCount === 1 ? "" : "s"}
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">Questionnaire</th>
              <th className="px-3 py-3 text-center">5</th>
              <th className="px-3 py-3 text-center">4</th>
              <th className="px-3 py-3 text-center">3</th>
              <th className="px-3 py-3 text-center">2</th>
              <th className="px-3 py-3 text-center">1</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {detail.questions.map((q, i) => (
              <tr key={q.id} className={i % 2 === 1 ? "bg-slate-50" : "bg-white"}>
                <td className="px-4 py-2.5 text-slate-700">{q.text}</td>
                <td className="px-3 py-2.5 text-center font-serif font-semibold text-brand-950">{q.counts[5]}</td>
                <td className="px-3 py-2.5 text-center font-serif font-semibold text-brand-950">{q.counts[4]}</td>
                <td className="px-3 py-2.5 text-center font-serif font-semibold text-brand-950">{q.counts[3]}</td>
                <td className="px-3 py-2.5 text-center font-serif font-semibold text-brand-950">{q.counts[2]}</td>
                <td className="px-3 py-2.5 text-center font-serif font-semibold text-brand-950">{q.counts[1]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-2xl border border-gold-200 bg-gold-50 px-6 py-4 text-center">
        <p className="text-lg font-bold text-brand-950">FEEDBACK % : {detail.percentage.toFixed(2)}%</p>
      </div>

      {detail.comments.length > 0 && (
        <div className="space-y-2.5">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <MessageSquareQuote className="h-3.5 w-3.5" /> Student Suggestions / Feedback
          </p>
          <div className="space-y-2">
            {detail.comments.map((c, i) => (
              <p key={i} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm italic text-slate-700">
                “{c}”
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
