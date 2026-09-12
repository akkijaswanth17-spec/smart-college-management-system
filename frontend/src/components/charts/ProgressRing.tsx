import { motion } from "framer-motion";
import { useReducedMotionPreference } from "../../hooks/useReducedMotionPreference";

/** A radial progress ring — e.g. how many of today's classes are done. */
export function ProgressRing({
  value,
  max,
  label,
  sublabel,
  size = 132,
  stroke = 12,
  color = "#123b70",
  trackColor = "#e7ded0",
}: {
  value: number;
  max: number;
  label: string;
  sublabel: string;
  size?: number;
  stroke?: number;
  color?: string;
  trackColor?: string;
}) {
  const reduceMotion = useReducedMotionPreference();
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = max > 0 ? Math.min(1, value / max) : 0;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={trackColor} strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: reduceMotion ? circumference * (1 - pct) : circumference }}
          animate={{ strokeDashoffset: circumference * (1 - pct) }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-serif text-2xl font-bold text-brand-950">{label}</span>
        <span className="text-[10.5px] font-medium uppercase tracking-wide text-slate-400">{sublabel}</span>
      </div>
    </div>
  );
}
