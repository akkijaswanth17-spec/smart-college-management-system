import { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Adds a subtle lift + shadow increase on hover — for clickable/interactive cards. */
  interactive?: boolean;
}

export function Card({ children, className = "", interactive = false, ...rest }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 ${
        interactive ? "hover:-translate-y-0.5 hover:shadow-md" : ""
      } ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "", ...rest }: CardProps) {
  return (
    <div className={`border-b border-slate-100 px-5 py-4 ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function CardBody({ children, className = "", ...rest }: CardProps) {
  return (
    <div className={`p-5 ${className}`} {...rest}>
      {children}
    </div>
  );
}
