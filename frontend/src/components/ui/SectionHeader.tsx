import { ReactNode } from "react";

/** A consistent premium section heading — small gold accent mark + serif title, optional trailing action. */
export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2.5 font-serif text-xl font-bold text-brand-950">
        <span className="h-1.5 w-1.5 rounded-full bg-gold-400" />
        {title}
      </h2>
      {action}
    </div>
  );
}
