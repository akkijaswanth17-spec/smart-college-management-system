import { UserRound } from "lucide-react";

const TONE_GRADIENT: Record<string, string> = {
  brand: "from-brand-400 to-brand-700",
  gold: "from-gold-400 to-gold-600",
  green: "from-emerald-400 to-emerald-600",
  maroon: "from-maroon-400 to-maroon-600",
};

/** Person avatar — shows the uploaded profile photo when there is one, otherwise a silhouette. */
export function PersonAvatar({
  tone = "brand",
  className = "h-14 w-14",
  ringed = false,
  src,
  alt = "",
}: {
  tone?: "brand" | "gold" | "green" | "maroon";
  className?: string;
  ringed?: boolean;
  src?: string | null;
  alt?: string;
}) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className={`shrink-0 rounded-full object-cover object-top shadow-inner ${ringed ? "ring-2 ring-white/70" : ""} ${className}`}
      />
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-white shadow-inner ${
        TONE_GRADIENT[tone]
      } ${ringed ? "ring-2 ring-white/70" : ""} ${className}`}
    >
      <UserRound className="h-1/2 w-1/2" strokeWidth={1.75} />
    </div>
  );
}
