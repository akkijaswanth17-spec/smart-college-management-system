import { motion } from "framer-motion";
import { useReducedMotionPreference } from "../../hooks/useReducedMotionPreference";

/**
 * A hero-style image with a slow, continuous, very subtle zoom (the
 * classic "Ken Burns" effect) plus a fade-in on mount. Disabled
 * automatically when the visitor has prefers-reduced-motion set.
 */
export function KenBurnsImage({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  const reduceMotion = useReducedMotionPreference();

  return (
    <motion.img
      src={src}
      alt={alt}
      className={className}
      initial={{ opacity: 0, scale: reduceMotion ? 1 : 1.08 }}
      animate={
        reduceMotion
          ? { opacity: 1, scale: 1 }
          : { opacity: 1, scale: [1.08, 1.16, 1.08] }
      }
      transition={
        reduceMotion
          ? { duration: 0.6, ease: "easeOut" }
          : {
              opacity: { duration: 0.8, ease: "easeOut" },
              scale: { duration: 24, ease: "easeInOut", repeat: Infinity },
            }
      }
    />
  );
}
