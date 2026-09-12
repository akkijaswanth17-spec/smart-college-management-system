import { motion, useScroll, useSpring } from "framer-motion";

/** A thin gold bar at the very top of the viewport, tracking scroll progress through the page. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 30, restDelta: 0.001 });

  return (
    <motion.div
      className="fixed left-0 right-0 top-0 z-[60] h-[3px] origin-left bg-gold-400"
      style={{ scaleX }}
    />
  );
}
