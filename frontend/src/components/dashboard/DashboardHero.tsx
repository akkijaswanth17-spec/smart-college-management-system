import { ReactNode } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { PersonAvatar } from "../ui/Avatar";

/** Shared, formal dashboard header used by every role — a plain letterhead-style card. */
export function DashboardHero({
  eyebrow,
  title,
  subtitle,
  avatarTone = "brand",
  avatarSrc,
  now,
  statusContent,
}: {
  eyebrow: string;
  title: string;
  subtitle: ReactNode;
  avatarTone?: "brand" | "gold" | "green" | "maroon";
  avatarSrc?: string | null;
  now: Date;
  statusContent?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-6 bg-brand-950 px-6 py-7 sm:px-9 sm:py-8">
        <div className="flex items-center gap-4">
          <PersonAvatar tone={avatarTone} className="h-14 w-14 sm:h-16 sm:w-16" ringed src={avatarSrc} />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">{eyebrow}</p>
            <h1 className="mt-1 font-serif text-2xl font-bold text-white sm:text-3xl">{title}</h1>
            <div className="mt-1.5 text-sm text-white/70">{subtitle}</div>
          </div>
        </div>
        <div className="hidden text-right sm:block">
          <p className="font-mono text-xl font-semibold tabular-nums text-white">{format(now, "hh:mm:ss a")}</p>
          <p className="text-xs text-white/50">{format(now, "EEEE, d MMMM yyyy")}</p>
        </div>
      </div>

      {statusContent && (
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-3.5 sm:px-9">{statusContent}</div>
      )}
    </motion.div>
  );
}

export function HeroStatusBadge({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "positive" | "accent";
  children: ReactNode;
}) {
  const toneClasses =
    tone === "positive"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "accent"
        ? "border-gold-300 bg-gold-50 text-gold-700"
        : "border-slate-300 bg-white text-slate-600";
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${toneClasses}`}
    >
      {children}
    </span>
  );
}
