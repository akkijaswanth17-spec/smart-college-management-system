import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, GraduationCap, BookUser, ShieldCheck, Building2 } from "lucide-react";

const LOGIN_OPTIONS = [
  { to: "/login", label: "Student Portal", hint: "For students", icon: GraduationCap },
  { to: "/faculty/login", label: "Faculty Login", hint: "For faculty", icon: BookUser },
  { to: "/branch/login", label: "Branch Login", hint: "For branch admins", icon: Building2 },
  { to: "/admin/login", label: "Admin Login", hint: "For administrators", icon: ShieldCheck },
];

const VARIANT_STYLES = {
  nav: "inline-flex items-center gap-1.5 rounded-full bg-brand-900 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-brand-800",
};

/** A "Login" trigger that expands to Student / Faculty / Admin options. Reused across the navbar, hero CTA, and inline toolbars. */
export function LoginMenu({
  triggerClassName,
  variant,
  label = "Login",
  align = "right",
}: {
  triggerClassName?: string;
  variant?: keyof typeof VARIANT_STYLES;
  label?: string;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const className = triggerClassName ?? VARIANT_STYLES[variant ?? "nav"];

  useEffect(() => {
    if (!open) return;
    // pointerdown (not mousedown) — mousedown's synthetic mobile-tap equivalent
    // can be delayed or skipped on some Android/Chrome versions, which left this
    // dropdown stuck open until a second tap.
    const onClick = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onClick);
    return () => document.removeEventListener("pointerdown", onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button type="button" onClick={() => setOpen((v) => !v)} className={className}>
        {label}
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          className={`absolute top-[calc(100%+10px)] z-10 w-64 overflow-hidden rounded-2xl border border-brand-100 bg-white py-2 text-left shadow-xl ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {LOGIN_OPTIONS.map(({ to, label: optLabel, hint, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 normal-case tracking-normal text-brand-900 transition-colors hover:bg-brand-50"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                <Icon className="h-4.5 w-4.5" />
              </span>
              <span>
                <span className="block text-sm font-bold">{optLabel}</span>
                <span className="block text-xs text-slate-400">{hint}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
