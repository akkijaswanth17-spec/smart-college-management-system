import { ButtonHTMLAttributes, forwardRef } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  /** Briefly shows a checkmark + successLabel instead of children — for "Saved!" style confirmations. */
  success?: boolean;
  successLabel?: string;
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-brand-900 text-white shadow-sm hover:bg-brand-800 hover:shadow-md focus-visible:ring-brand-700",
  secondary: "bg-gold-400 text-brand-950 shadow-sm hover:bg-gold-500 hover:shadow-md focus-visible:ring-gold-400",
  outline: "border border-slate-300 bg-white text-brand-900 hover:border-brand-300 hover:bg-brand-50 focus-visible:ring-brand-400",
  ghost: "text-slate-600 hover:bg-slate-100 focus-visible:ring-brand-400",
  danger: "bg-maroon-600 text-white hover:bg-maroon-500 focus-visible:ring-maroon-500",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2.5 text-sm",
  lg: "px-6 py-3 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = "primary", size = "md", loading, success, successLabel, className = "", disabled, children, ...rest },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100 disabled:shadow-none ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...rest}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {success ? (
          <>
            <CheckCircle2 className="h-4 w-4" /> {successLabel ?? "Done"}
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);
Button.displayName = "Button";
