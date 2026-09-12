import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Logo } from "../components/Logo";
import { KenBurnsImage } from "../components/motion/KenBurnsImage";
import { useReducedMotionPreference } from "../hooks/useReducedMotionPreference";
import building from "../assets/college-hero.jpg";
import { COLLEGE_NAME } from "../constants";

export function AuthLayout({
  title,
  subtitle,
  children,
  wide,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const reduceMotion = useReducedMotionPreference();

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden lg:block overflow-hidden">
        <KenBurnsImage src={building} alt="College campus" className="h-full w-full object-cover" />
        {/* Deepens toward crimson in step with the image's slow zoom-in, then eases back — a cinematic "zoom to red" breathing effect. */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-t from-brand-950 via-brand-900/55 to-brand-950/15"
          initial={{ opacity: reduceMotion ? 0.85 : 0.65 }}
          animate={reduceMotion ? { opacity: 0.85 } : { opacity: [0.65, 0.95, 0.65] }}
          transition={
            reduceMotion
              ? { duration: 0.6, ease: "easeOut" }
              : { duration: 24, ease: "easeInOut", repeat: Infinity }
          }
        />
        <div className="absolute left-10 top-10">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-gold-400 bg-white/95 p-1 shadow-xl">
            <Logo size="sm" showText={false} />
          </div>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="absolute bottom-12 left-10 right-10 text-white"
        >
          <p className="font-serif text-3xl font-bold leading-tight">{COLLEGE_NAME}</p>
          <p className="mt-3 border-l-4 border-gold-400 pl-3 text-sm text-white/75">
            Your campus, connected — one platform for students, faculty and college administration.
          </p>
        </motion.div>
      </div>

      <div className="flex items-center justify-center bg-white px-4 py-10 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={`w-full ${wide ? "max-w-xl" : "max-w-md"}`}
        >
          <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-brand-700">
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
          <div className="lg:hidden">
            <Logo size="md" />
          </div>
          <h1 className="mt-6 font-serif text-2xl font-bold text-brand-950">{title}</h1>
          <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </motion.div>
      </div>
    </div>
  );
}
