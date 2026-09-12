import { LucideIcon } from "lucide-react";
import { AnimatedCounter } from "../motion/AnimatedCounter";

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "brand",
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone?: "brand" | "gold" | "green" | "red";
}) {
  const toneClasses = {
    brand: "bg-brand-50 text-brand-600",
    gold: "bg-gold-50 text-gold-600",
    green: "bg-emerald-50 text-emerald-600",
    red: "bg-red-50 text-red-600",
  }[tone];

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${toneClasses}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="font-serif text-2xl font-bold text-brand-950">
          {typeof value === "number" ? <AnimatedCounter value={value} /> : value}
        </p>
        <p className="text-sm text-slate-500">{label}</p>
      </div>
    </div>
  );
}
