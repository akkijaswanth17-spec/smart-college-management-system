import { motion } from "framer-motion";
import { useReducedMotionPreference } from "../../hooks/useReducedMotionPreference";

export interface BarDatum {
  label: string;
  value: number;
  highlighted?: boolean;
}

/** A small, real-data bar chart — no chart library, just proportional flex bars. */
export function BarChart({ data, unit = "classes" }: { data: BarDatum[]; unit?: string }) {
  const reduceMotion = useReducedMotionPreference();
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="flex h-40 items-end gap-3 sm:gap-4">
      {data.map((d, i) => {
        const heightPct = (d.value / max) * 100;
        return (
          <div key={d.label} className="flex flex-1 flex-col items-center gap-2">
            <span className={`text-xs font-bold tabular-nums ${d.highlighted ? "text-gold-600" : "text-slate-400"}`}>
              {d.value}
            </span>
            <div className="flex h-28 w-full items-end rounded-md bg-slate-100">
              <motion.div
                initial={{ height: reduceMotion ? `${heightPct}%` : 0 }}
                animate={{ height: `${heightPct}%` }}
                transition={{ duration: 0.6, delay: i * 0.06, ease: "easeOut" }}
                className={`w-full rounded-md ${d.highlighted ? "bg-gradient-to-t from-gold-500 to-gold-300" : "bg-gradient-to-t from-brand-700 to-brand-400"}`}
                title={`${d.value} ${unit} on ${d.label}`}
              />
            </div>
            <span className={`text-[11px] font-semibold uppercase tracking-wide ${d.highlighted ? "text-gold-600" : "text-slate-400"}`}>
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
