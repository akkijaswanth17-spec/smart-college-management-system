import logo from "../assets/college-logo.jpeg";
import { COLLEGE_NAME_SHORT, COLLEGE_TAGLINE, COLLEGE_NAME } from "../constants";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  variant?: "horizontal" | "stacked" | "compact";
  dark?: boolean;
}

export function Logo({ size = "md", showText = true, variant = "horizontal", dark = false }: LogoProps) {
  const dims = { sm: "h-9 w-9", md: "h-11 w-11", lg: "h-16 w-16", xl: "h-20 w-20" }[size];
  const textSize = { sm: "text-sm", md: "text-base", lg: "text-xl", xl: "text-2xl" }[size];
  const nameColor = dark ? "text-white" : "text-brand-800";
  const taglineColor = dark ? "text-white/60" : "text-slate-500";

  const img = (
    <img
      src={logo}
      alt={`${COLLEGE_NAME} logo`}
      className={`${dims} shrink-0 rounded-full border ${dark ? "border-white/20" : "border-slate-200"} bg-white object-contain p-0.5`}
    />
  );

  if (variant === "compact") {
    // Small logo mark + two-line name, left-aligned — for inline use in a navbar.
    // Respects `dark` so the same navbar can toggle from transparent/white text
    // (over a hero image) to solid/navy text (after scrolling).
    return (
      <div className="flex items-center gap-2.5">
        <img
          src={logo}
          alt={`${COLLEGE_NAME} logo`}
          className={`h-10 w-10 shrink-0 rounded-full border bg-white object-contain p-0.5 ${dark ? "border-white/30" : "border-brand-100"}`}
        />
        <div className="leading-tight">
          <p className={`font-serif text-sm font-bold uppercase tracking-wide sm:text-base ${dark ? "text-white" : "text-brand-900"}`}>
            {COLLEGE_NAME_SHORT}
          </p>
          <p className={`text-[10px] font-semibold uppercase tracking-widest sm:text-xs ${dark ? "text-white/70" : "text-ink-slate"}`}>
            {COLLEGE_TAGLINE}
          </p>
        </div>
      </div>
    );
  }

  if (variant === "stacked") {
    return (
      <div className="flex flex-col items-center text-center">
        {img}
        <p className={`mt-3 font-serif text-xl font-bold tracking-wide ${nameColor} sm:text-2xl`}>{COLLEGE_NAME}</p>
        <p className={`mt-1 text-xs font-semibold uppercase tracking-[0.3em] ${taglineColor}`}>Management System</p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {img}
      {showText && (
        <div className="leading-tight">
          <p className={`font-serif font-bold ${nameColor} ${textSize}`}>{COLLEGE_NAME_SHORT}</p>
          <p className={`text-xs font-medium uppercase tracking-wider ${taglineColor}`}>{COLLEGE_TAGLINE}</p>
        </div>
      )}
    </div>
  );
}
