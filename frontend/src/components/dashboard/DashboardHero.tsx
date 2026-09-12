import { ReactNode } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { PersonAvatar } from "../ui/Avatar";

/** Shared, formal dashboard header used by every role — a letterhead-style card. */
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
      className="overflow-hidden rounded-2xl border border-slate-200 shadow-md"
    >
      <div className="h-1 bg-gradient-to-r from-gold-500 via-gold-300 to-gold-500" />

      <div className="relative overflow-hidden bg-gradient-to-br from-brand-950 via-brand-900 to-brand-950 px-6 py-7 sm:px-9 sm:py-8">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(135deg, #fff 0px, #fff 1px, transparent 1px, transparent 22px)",
          }}
        />

        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-5">
            <PersonAvatar
              tone={avatarTone}
              className="h-16 w-16 shrink-0 ring-2 ring-gold-400/70 ring-offset-2 ring-offset-brand-950 sm:h-[4.5rem] sm:w-[4.5rem]"
              ringed
              src={avatarSrc}
            />
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-gold-300">{eyebrow}</p>
              <h1 className="mt-1.5 truncate font-serif text-2xl font-bold leading-tight text-white sm:text-[1.75rem]">
                {title}
              </h1>
              <div className="mt-1 h-px w-14 bg-gold-400/50" />
              <div className="mt-2 text-sm text-white/65">{subtitle}</div>
            </div>
          </div>
          <div className="hidden shrink-0 rounded-lg border border-white/10 bg-white/[0.06] px-4 py-2.5 text-right sm:block">
            <p className="font-mono text-xl font-semibold tabular-nums text-white">{format(now, "hh:mm:ss a")}</p>
            <p className="mt-0.5 text-xs text-white/50">{format(now, "EEEE, d MMMM yyyy")}</p>
          </div>
        </div>
      </div>

      {statusContent && (
        <div className="border-t border-slate-200 bg-white px-6 py-3.5 sm:px-9">{statusContent}</div>
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
        : "border-slate-300 bg-slate-50 text-slate-600";
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${toneClasses}`}
    >
      {children}
    </span>
  );
}
