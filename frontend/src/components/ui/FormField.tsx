import { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes, forwardRef } from "react";

interface WrapperProps {
  label?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}

function FieldWrapper({ label, error, hint, children }: WrapperProps) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm font-medium text-brand-900">{label}</label>}
      {children}
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}

const baseInputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-brand-950 placeholder:text-slate-400 transition-shadow duration-150 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-100 disabled:bg-slate-50 disabled:text-slate-400";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}
export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, hint, className = "", ...rest }, ref) => (
  <FieldWrapper label={label} error={error} hint={hint}>
    <input ref={ref} className={`${baseInputClass} ${error ? "border-red-400" : ""} ${className}`} {...rest} />
  </FieldWrapper>
));
Input.displayName = "Input";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className = "", ...rest }, ref) => (
    <FieldWrapper label={label} error={error} hint={hint}>
      <textarea ref={ref} className={`${baseInputClass} min-h-[96px] ${error ? "border-red-400" : ""} ${className}`} {...rest} />
    </FieldWrapper>
  )
);
Textarea.displayName = "Textarea";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, className = "", children, ...rest }, ref) => (
    <FieldWrapper label={label} error={error} hint={hint}>
      <select ref={ref} className={`${baseInputClass} ${error ? "border-red-400" : ""} ${className}`} {...rest}>
        {children}
      </select>
    </FieldWrapper>
  )
);
Select.displayName = "Select";
