import { ReactNode, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Logo } from "../components/Logo";
import { ScrollProgress } from "../components/ScrollProgress";
import { LoginMenu } from "../components/LoginMenu";
import { Mail, Phone, MapPin, Twitter, Facebook, Instagram, Linkedin, ArrowUp } from "lucide-react";
import building from "../assets/college-hero.jpg";
import { COLLEGE_NAME, COLLEGE_ADDRESS, COLLEGE_MAPS_URL, COLLEGE_PHONES, COLLEGE_EMAIL } from "../constants";

function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 500);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Scroll to top"
      className="fixed bottom-6 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-brand-700 text-white shadow-lg transition hover:bg-brand-800"
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}

const NAV_LINKS = [
  { to: "/", label: "Home", kind: "route" as const },
  { to: "#platform", label: "Platform", kind: "anchor" as const },
  { to: "#about", label: "About", kind: "anchor" as const },
  { to: "/lost-found", label: "Lost & Found", kind: "route" as const },
  { to: "#footer-contact", label: "Contact", kind: "anchor" as const },
];

/**
 * `transparentNav` is for pages with a full-bleed hero behind the nav (the
 * homepage) — the bar starts see-through with light text over the image,
 * then solidifies to ivory/navy once the visitor scrolls past it. Every
 * other public page just gets a permanently solid bar.
 */
export function PublicLayout({ children, transparentNav = false }: { children: ReactNode; transparentNav?: boolean }) {
  const [scrolled, setScrolled] = useState(!transparentNav);

  useEffect(() => {
    if (!transparentNav) return;
    const onScroll = () => setScrolled(window.scrollY > 64);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [transparentNav]);

  const solid = !transparentNav || scrolled;

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <ScrollProgress />

      <header className={`${transparentNav ? "fixed" : "sticky"} inset-x-0 top-0 z-40`}>
        <nav
          className={`transition-colors duration-300 ${
            solid ? "border-b border-brand-100 bg-ivory/95 shadow-sm backdrop-blur-md" : "bg-transparent"
          }`}
        >
          <div className="container-page flex flex-wrap items-center justify-between gap-y-2 py-3.5">
            <Link to="/" className="shrink-0">
              <Logo variant="compact" dark={!solid} />
            </Link>

            <div
              className={`hidden items-center gap-7 text-sm font-semibold uppercase tracking-wide lg:flex ${
                solid ? "text-brand-900" : "text-white"
              }`}
            >
              {NAV_LINKS.map((link) =>
                link.kind === "route" ? (
                  <Link key={link.label} to={link.to} className="relative pb-0.5 transition-colors after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 after:bg-gold-400 after:transition-all after:duration-300 hover:after:w-full">
                    {link.label}
                  </Link>
                ) : (
                  <a key={link.label} href={link.to} className="relative pb-0.5 transition-colors after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 after:bg-gold-400 after:transition-all after:duration-300 hover:after:w-full">
                    {link.label}
                  </a>
                )
              )}
            </div>

            <LoginMenu
              triggerClassName={`group inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold uppercase tracking-wide transition-all ${
                solid ? "bg-brand-900 text-white hover:bg-brand-800" : "bg-white/95 text-brand-900 hover:bg-white"
              }`}
            />
          </div>
        </nav>
      </header>

      <main className="flex-1">{children}</main>

      <footer id="footer-contact" className="relative overflow-hidden bg-brand-950 text-white">
        <img src={building} alt="" className="absolute inset-0 h-full w-full object-cover opacity-10" />
        <div className="relative">
          <div className="container-page grid gap-10 py-16 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Logo size="md" dark />
              <p className="mt-4 text-sm text-white/60">
                One digital campus platform for students, faculty and college administration.
              </p>
              <div className="mt-5 flex items-center gap-3">
                <a href="#" aria-label="Twitter" className="rounded-full border border-white/20 p-2 hover:border-gold-400 hover:text-gold-300">
                  <Twitter className="h-4 w-4" />
                </a>
                <a href="#" aria-label="Facebook" className="rounded-full border border-white/20 p-2 hover:border-gold-400 hover:text-gold-300">
                  <Facebook className="h-4 w-4" />
                </a>
                <a href="#" aria-label="Instagram" className="rounded-full border border-white/20 p-2 hover:border-gold-400 hover:text-gold-300">
                  <Instagram className="h-4 w-4" />
                </a>
                <a href="#" aria-label="LinkedIn" className="rounded-full border border-white/20 p-2 hover:border-gold-400 hover:text-gold-300">
                  <Linkedin className="h-4 w-4" />
                </a>
              </div>
            </div>

            <div>
              <h4 className="font-serif text-lg font-semibold text-gold-300">Get in Touch</h4>
              <ul className="mt-4 space-y-3 text-sm text-white/70">
                <li className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                  <a href={COLLEGE_MAPS_URL} target="_blank" rel="noreferrer" className="hover:text-white">
                    {COLLEGE_ADDRESS}
                  </a>
                </li>
                {COLLEGE_PHONES.map((phone) => (
                  <li key={phone} className="flex items-center gap-2">
                    <Phone className="h-4 w-4 shrink-0" />
                    <a href={`tel:${phone.replace(/\s/g, "")}`} className="hover:text-white">
                      {phone}
                    </a>
                  </li>
                ))}
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4 shrink-0" />
                  <a href={`mailto:${COLLEGE_EMAIL}`} className="hover:text-white">
                    {COLLEGE_EMAIL}
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-serif text-lg font-semibold text-gold-300">Platform</h4>
              <ul className="mt-4 space-y-2.5 text-sm text-white/70">
                <li>Digital Notice Board</li>
                <li>Academic Updates</li>
                <li>
                  <Link to="/lost-found" className="hover:text-white">
                    Lost &amp; Found
                  </Link>
                </li>
                <li>Smart Timetable</li>
              </ul>
            </div>

            <div>
              <h4 className="font-serif text-lg font-semibold text-gold-300">Sign In</h4>
              <ul className="mt-4 space-y-2.5 text-sm text-white/70">
                <li>
                  <Link to="/login" className="hover:text-white">
                    Student Portal
                  </Link>
                </li>
                <li>
                  <Link to="/faculty/login" className="hover:text-white">
                    Faculty Login
                  </Link>
                </li>
                <li>
                  <Link to="/branch/login" className="hover:text-white">
                    Branch Login
                  </Link>
                </li>
                <li>
                  <Link to="/admin/login" className="hover:text-white">
                    Admin Login
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 py-5">
            <div className="container-page flex flex-col items-center justify-between gap-2 text-xs text-white/50 sm:flex-row">
              <p>&copy; {new Date().getFullYear()} {COLLEGE_NAME}. All Rights Reserved.</p>
              <p>Developed by Akki Jaswanth</p>
            </div>
          </div>
        </div>
      </footer>

      <ScrollToTopButton />
    </div>
  );
}
