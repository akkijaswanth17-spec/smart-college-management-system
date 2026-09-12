import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useReducedMotionPreference } from "../../hooks/useReducedMotionPreference";

/**
 * A background image that drifts slightly slower than the page while its
 * container scrolls past — the classic subtle parallax. Disabled entirely
 * for prefers-reduced-motion (renders as a static image instead).
 */
export function ParallaxImage({ src, alt = "", className = "" }: { src: string; alt?: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotionPreference();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);

  return (
    <div ref={ref} className={className}>
      <motion.img
        src={src}
        alt={alt}
        style={reduceMotion ? undefined : { y }}
        className="h-[130%] w-full object-cover"
      />
    </div>
  );
}
