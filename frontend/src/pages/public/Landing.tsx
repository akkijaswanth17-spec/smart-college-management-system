import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Megaphone,
  BookOpen,
  Search,
  CalendarClock,
  CreditCard,
  GraduationCap,
  Quote,
  Award,
  BadgeCheck,
  CalendarDays,
  Layers,
  ExternalLink,
  ArrowRight,
  ArrowDown,
  MessageCircle,
  Wallet,
} from "lucide-react";
import { PublicLayout } from "../../layouts/PublicLayout";
import { LoginMenu } from "../../components/LoginMenu";
import { ParallaxImage } from "../../components/motion/ParallaxImage";
import { AnimatedCounter } from "../../components/motion/AnimatedCounter";
import { useReducedMotionPreference } from "../../hooks/useReducedMotionPreference";
import building from "../../assets/college-hero.jpg";
import logo from "../../assets/college-logo.jpeg";
import principal from "../../assets/principal.jpg";
import { COLLEGE_NAME_SHORT, COLLEGE_TAGLINE } from "../../constants";
import { settingsService } from "../../services/settings.service";

const MODULES = ["Notice Board", "Timetable", "Academics", "Results", "Fees", "Lost & Found"];

const FEATURES = [
  {
    icon: Megaphone,
    title: "Digital Notice Board",
    description: "Academic, examination and emergency notices — published in one place the moment they're official.",
    stat: "3",
    statLabel: "notices this week",
    to: undefined as string | undefined,
  },
  {
    icon: BookOpen,
    title: "Academic Updates",
    description: "Exam schedules, assignments and internal deadlines, scoped to your department, year and section.",
    stat: "Live",
    statLabel: "always current",
    to: undefined as string | undefined,
  },
  {
    icon: Search,
    title: "Lost & Found",
    description: "Report or search items lost on campus, with photos and contact details — open to everyone, no account needed.",
    stat: "Public",
    statLabel: "no login required",
    to: "/lost-found",
  },
  {
    icon: CalendarClock,
    title: "Smart Timetable",
    description: "Faculty get an automatic reminder five minutes before every class — on-screen and on their phone.",
    stat: "5 min",
    statLabel: "advance notice",
    to: undefined as string | undefined,
  },
];

const COLLEGE_FACTS = [
  { icon: CalendarDays, stat: 2002, suffix: "", label: "Established" },
  { icon: Award, stat: 0, suffix: "NAAC A+", label: "Accreditation, with NBA (twice) & ISO certified" },
  { icon: BadgeCheck, stat: 0, suffix: "AICTE", label: "Approved, affiliated to JNTU Kakinada" },
  { icon: Layers, stat: 8, suffix: "+", label: "Degree & diploma programs" },
];

function fadeUp(delay = 0) {
  return {
    initial: { opacity: 0, y: 22 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-80px" },
    transition: { duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] as const },
  };
}

export default function Landing() {
  const [feeUrl, setFeeUrl] = useState<string | null>(null);
  const [resultsUrl, setResultsUrl] = useState<string | null>(null);
  const reduceMotion = useReducedMotionPreference();

  useEffect(() => {
    settingsService.getFeeLink().then(setFeeUrl).catch(() => setFeeUrl(null));
    settingsService.getResultsLink().then(setResultsUrl).catch(() => setResultsUrl(null));
  }, []);

  const heroContainer = {
    hidden: {},
    show: { transition: { staggerChildren: reduceMotion ? 0 : 0.14, delayChildren: reduceMotion ? 0 : 0.25 } },
  };
  const heroItem = {
    hidden: { opacity: 0, y: 26 },
    show: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] as const } },
  };

  return (
    <PublicLayout transparentNav>
      {/* ============ HERO — cinematic, full-bleed, real campus photo ============ */}
      <section className="relative isolate flex min-h-[100svh] items-center overflow-hidden bg-brand-950">
        <ParallaxImage src={building} alt="College campus building" className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-b from-brand-950/75 via-brand-950/60 to-brand-950/92" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-950 via-transparent to-transparent" />

        {/* Floating vertical campus label */}
        <div className="pointer-events-none absolute right-8 top-1/2 hidden -translate-y-1/2 lg:block">
          <div className="flex -rotate-90 items-center gap-3 whitespace-nowrap text-xs font-bold uppercase tracking-[0.5em] text-white/45">
            <span className="h-px w-8 bg-gold-400/60" /> Digital Campus
          </div>
        </div>

        <motion.div
          className="container-page relative z-10 flex flex-col items-center pb-20 pt-28 text-center"
          variants={heroContainer}
          initial="hidden"
          animate="show"
        >
          <motion.img
            variants={heroItem}
            src={logo}
            alt={`${COLLEGE_NAME_SHORT} logo`}
            className="h-20 w-20 rounded-full border-2 border-gold-400 bg-white object-contain p-1.5 shadow-2xl sm:h-24 sm:w-24"
          />

          <motion.p variants={heroItem} className="mt-7 text-xs font-bold uppercase tracking-[0.4em] text-gold-300">
            One Platform &middot; Every Student
          </motion.p>

          <motion.h1 variants={heroItem} className="mt-5 max-w-3xl font-serif text-4xl font-bold uppercase leading-[1.12] text-white sm:text-6xl">
            {COLLEGE_NAME_SHORT}
            <br />
            <span className="italic text-gold-300">{COLLEGE_TAGLINE}</span>
          </motion.h1>

          <motion.p variants={heroItem} className="mt-6 max-w-lg text-base text-white/75 sm:text-lg">
            A smarter digital experience for students, faculty and campus life.
          </motion.p>

          <motion.div variants={heroItem} className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <LoginMenu
              label="Login to Continue"
              align="left"
              triggerClassName="group inline-flex items-center gap-2 rounded-full bg-gold-400 px-7 py-3.5 text-sm font-bold uppercase tracking-wide text-brand-950 shadow-lg transition-all hover:bg-gold-300"
            />
            <a
              href="#campus"
              className="group inline-flex items-center gap-2 rounded-full border border-white/30 px-7 py-3.5 text-sm font-bold uppercase tracking-wide text-white transition-all hover:border-white hover:bg-white/10"
            >
              Explore Campus
            </a>
          </motion.div>
        </motion.div>

        <motion.a
          href="#transition"
          className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2 text-white/60"
          animate={reduceMotion ? undefined : { y: [0, 8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <span className="text-[10px] font-semibold uppercase tracking-[0.3em]">Scroll</span>
          <ArrowDown className="h-4 w-4" />
        </motion.a>
      </section>

      {/* ============ TRANSITION — one line, then the modules unfold ============ */}
      <section id="transition" className="bg-ivory py-24">
        <div className="container-page text-center">
          <motion.h2 {...fadeUp()} className="mx-auto max-w-3xl font-serif text-3xl font-bold text-brand-950 sm:text-5xl">
            One Campus. <span className="italic text-brand-600">One Digital Experience.</span>
          </motion.h2>
          <div className="mx-auto mt-14 flex max-w-4xl flex-wrap items-center justify-center gap-x-3 gap-y-4 sm:gap-x-5">
            {MODULES.map((m, i) => (
              <motion.span
                key={m}
                {...fadeUp(i * 0.08)}
                className="rounded-full border border-brand-100 bg-white px-5 py-2.5 text-sm font-semibold text-brand-900 shadow-sm sm:text-base"
              >
                {m}
              </motion.span>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FEATURES — asymmetric editorial rows, not identical cards ============ */}
      <section id="platform" className="bg-white py-24">
        <div className="container-page space-y-20">
          {FEATURES.map((f, i) => {
            const reversed = i % 2 === 1;
            const body = (
              <div className={`flex-1 ${reversed ? "lg:text-right" : ""}`}>
                <div className={`flex items-center gap-3 ${reversed ? "lg:flex-row-reverse" : ""}`}>
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-950 text-gold-300">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <span className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-ink-slate">
                    0{i + 1} / Platform
                  </span>
                </div>
                <h3 className="mt-6 font-serif text-3xl font-bold text-brand-950 sm:text-4xl">{f.title}</h3>
                <p className={`mt-4 max-w-md text-base leading-relaxed text-ink-slate ${reversed ? "lg:ml-auto" : ""}`}>
                  {f.description}
                </p>
                {f.to && (
                  <Link
                    to={f.to}
                    className={`group mt-6 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-brand-700 ${
                      reversed ? "lg:flex-row-reverse" : ""
                    }`}
                  >
                    Explore <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                )}
              </div>
            );
            const visual = (
              <div className="flex flex-1 justify-center">
                <div className="flex h-40 w-40 flex-col items-center justify-center rounded-3xl border border-brand-100 bg-brand-50 shadow-sm sm:h-48 sm:w-48">
                  <p className="font-serif text-4xl font-bold text-brand-800 sm:text-5xl">{f.stat}</p>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-ink-slate">{f.statLabel}</p>
                </div>
              </div>
            );
            return (
              <motion.div
                key={f.title}
                {...fadeUp()}
                className={`flex flex-col items-center gap-10 lg:flex-row ${reversed ? "lg:flex-row-reverse" : ""}`}
              >
                {body}
                {visual}
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ============ CAMPUS IMAGE — the real building, differently cropped ============ */}
      <section id="campus" className="relative isolate overflow-hidden bg-brand-950 py-24">
        <div className="container-page">
          <motion.div {...fadeUp()} className="relative overflow-hidden rounded-3xl border border-white/10 shadow-2xl">
            <img src={building} alt="Campus building" className="h-[420px] w-full object-cover object-[50%_30%] transition-transform duration-700 hover:scale-105 sm:h-[520px]" />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-950/85 via-brand-950/20 to-transparent" />
            <div className="absolute bottom-8 left-8 right-8 sm:bottom-12 sm:left-12">
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-gold-300">Digital Campus</p>
              <h2 className="mt-3 max-w-xl font-serif text-3xl font-bold text-white sm:text-4xl">
                Everything you need, connected in one place.
              </h2>
            </div>
          </motion.div>

          <div className="mx-auto -mt-10 grid max-w-4xl gap-4 px-4 sm:-mt-8 sm:grid-cols-4">
            {COLLEGE_FACTS.map((fact, i) => (
              <motion.div
                key={fact.label}
                {...fadeUp(i * 0.08)}
                className="rounded-2xl border border-white/10 bg-brand-900/90 p-5 text-center shadow-xl backdrop-blur"
              >
                <fact.icon className="mx-auto h-6 w-6 text-gold-300" />
                <p className="mt-3 font-serif text-2xl font-bold text-white">
                  {fact.stat > 0 ? <AnimatedCounter value={fact.stat} /> : null}
                  {fact.suffix}
                </p>
                <p className="mt-1 text-xs text-white/60">{fact.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ SMART CAMPUS PREVIEW — a real look at the portal ============ */}
      <section className="bg-ivory py-24">
        <div className="container-page grid items-center gap-14 lg:grid-cols-2">
          <motion.div {...fadeUp()}>
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-brand-600">Smart Campus Preview</p>
            <h2 className="mt-4 font-serif text-3xl font-bold text-brand-950 sm:text-4xl">
              Not just a website — a digital campus platform.
            </h2>
            <p className="mt-5 max-w-md text-base leading-relaxed text-ink-slate">
              Students sign in to a personal dashboard built around their real schedule — today's classes, active
              notices and academic updates, all in one screen, updated the moment the college publishes something new.
            </p>
          </motion.div>

          <motion.div {...fadeUp(0.1)} className="mx-auto w-full max-w-md">
            <div className="overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-2xl">
              <div className="flex items-center gap-2 bg-brand-950 px-5 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-gold-400/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/30" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/30" />
                <span className="ml-2 font-mono text-[11px] text-white/50">student-portal</span>
              </div>
              <div className="p-6">
                <p className="font-serif text-lg font-bold text-brand-950">Good Morning 👋</p>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {[
                    { label: "Classes", value: "5" },
                    { label: "Notices", value: "3" },
                    { label: "Updates", value: "2" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl border border-brand-100 bg-brand-50 p-3 text-center">
                      <p className="font-serif text-xl font-bold text-brand-800">{s.value}</p>
                      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-slate">{s.label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-xl border border-gold-200 bg-gold-50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gold-600">Next Class</p>
                  <p className="mt-1 text-sm font-semibold text-brand-950">Big Data &amp; Cloud Computing</p>
                  <p className="text-xs text-ink-slate">Room DCME-301 &middot; 10:00 AM</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============ FEE / RESULTS ============ */}
      <section className="border-y border-brand-100 bg-white py-16">
        <div className="container-page grid gap-6 sm:grid-cols-2">
          <a
            href={feeUrl ?? undefined}
            target="_blank"
            rel="noreferrer"
            aria-disabled={!feeUrl}
            className={`group flex items-center gap-5 rounded-2xl border border-brand-100 p-6 transition hover:-translate-y-0.5 hover:shadow-lg ${
              !feeUrl ? "pointer-events-none opacity-50" : ""
            }`}
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gold-50 text-gold-600">
              <CreditCard className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-serif text-lg font-semibold text-brand-950">Fee Payment</h3>
              <p className="text-sm text-ink-slate">Pay your college fees securely through the official portal.</p>
            </div>
            <ExternalLink className="h-4 w-4 shrink-0 text-brand-200 transition group-hover:text-brand-600" />
          </a>
          <a
            href={resultsUrl ?? undefined}
            target="_blank"
            rel="noreferrer"
            aria-disabled={!resultsUrl}
            className={`group flex items-center gap-5 rounded-2xl border border-brand-100 p-6 transition hover:-translate-y-0.5 hover:shadow-lg ${
              !resultsUrl ? "pointer-events-none opacity-50" : ""
            }`}
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-serif text-lg font-semibold text-brand-950">Results</h3>
              <p className="text-sm text-ink-slate">Check your semester results the moment they're published.</p>
            </div>
            <ExternalLink className="h-4 w-4 shrink-0 text-brand-200 transition group-hover:text-brand-600" />
          </a>
        </div>
      </section>

      {/* ============ PRINCIPAL'S DESK ============ */}
      <section className="bg-brand-950 py-20">
        <div className="container-page grid items-center gap-10 md:grid-cols-[260px_1fr] md:gap-14">
          <motion.div {...fadeUp()} className="mx-auto md:mx-0">
            <div className="relative w-56 md:w-full">
              <div className="overflow-hidden rounded-2xl border-4 border-gold-400 shadow-2xl">
                <img src={principal} alt="Guntu Rajesh, Principal" className="aspect-[4/5] w-full object-cover" />
              </div>
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gold-400 px-4 py-1 text-xs font-bold uppercase tracking-wide text-brand-950 shadow-md">
                Principal
              </div>
            </div>
          </motion.div>

          <motion.div {...fadeUp(0.1)} className="text-center md:text-left">
            <Quote className="mx-auto h-8 w-8 text-gold-300 md:mx-0" />
            <p className="mt-2 text-sm font-semibold uppercase tracking-[0.3em] text-white/50">From the Principal&rsquo;s Desk</p>
            <h2 className="mt-3 font-serif text-3xl font-bold text-white sm:text-4xl">Sri Guntu Rajesh</h2>
            <p className="mt-1 text-sm font-semibold uppercase tracking-wide text-gold-300">Principal, Diploma Wing</p>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/70 md:mx-0">
              Discipline is the foundation on which every lasting institution is built — and it is a value Sri Guntu
              Rajesh upholds without compromise. Under his stewardship, the Diploma Wing has become synonymous with
              order, rigor and integrity, shaping engineers who are as dependable in character as they are skilled
              in their craft. His vision is simple: excellence is not an event, it is a discipline practiced every
              single day.
            </p>
          </motion.div>
        </div>
      </section>
    </PublicLayout>
  );
}
