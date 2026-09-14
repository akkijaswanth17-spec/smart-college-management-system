import { ReactNode, useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { LucideIcon, Menu, X, LogOut, ChevronDown } from "lucide-react";
import { Logo } from "../components/Logo";
import { NotificationBell } from "../components/NotificationBell";
import { AvatarUploadButton } from "../components/AvatarUploadButton";
import { PageTransition } from "../components/motion/PageTransition";
import { useAuth } from "../context/AuthContext";
import { getDisplayName } from "../utils/displayName";

const ROLE_TONE: Record<string, "brand" | "gold" | "maroon"> = {
  STUDENT: "brand",
  FACULTY: "gold",
  ADMIN: "maroon",
  BRANCH: "maroon",
};

export interface NavLeaf {
  label: string;
  to: string;
  icon: LucideIcon;
  end?: boolean;
}

export interface NavItem extends NavLeaf {
  /** Sub-items revealed by the row's own expand arrow — e.g. Timetable > Timetable Import.
   * The parent row itself still navigates to its own `to` when clicked. */
  children?: NavLeaf[];
}

const leafLinkClass = (isActive: boolean) =>
  `group relative flex flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
    isActive ? "bg-brand-800 text-white shadow-sm" : "text-slate-600 hover:bg-brand-50 hover:text-brand-800"
  }`;

export function DashboardLayout({
  navItems,
  roleLabel,
  loginPath,
  children,
}: {
  navItems: NavItem[];
  roleLabel: string;
  /** Where logout should land — this role's own login page, not a generic one. */
  loginPath: string;
  children: ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const displayName = getDisplayName(user);

  // A group starts open if the current page is one of its own children — otherwise
  // collapsed by default until the admin clicks its arrow open.
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    navItems.forEach((item) => {
      if (item.children?.some((c) => location.pathname.startsWith(c.to))) {
        initial.add(item.label);
      }
    });
    return initial;
  });

  function toggleGroup(label: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  async function handleLogout() {
    await logout();
    navigate(loginPath, { replace: true });
  }

  const sidebarContent = (
    <>
      <div className="flex items-center justify-between px-5 py-5">
        <Logo size="sm" />
        <button className="lg:hidden" onClick={() => setDrawerOpen(false)} aria-label="Close menu">
          <X className="h-5 w-5 text-slate-500" />
        </button>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {navItems.map((item) => (
          <div key={item.to}>
            <div className="flex items-center gap-1">
              <NavLink
                to={item.to}
                end={item.end}
                onClick={() => setDrawerOpen(false)}
                className={({ isActive }) => leafLinkClass(isActive)}
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId="active-nav-accent"
                        className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-gold-400"
                        transition={{ type: "spring", stiffness: 500, damping: 35 }}
                      />
                    )}
                    <item.icon className="h-4.5 w-4.5 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:scale-110" />
                    {item.label}
                  </>
                )}
              </NavLink>
              {item.children && (
                <button
                  type="button"
                  onClick={() => toggleGroup(item.label)}
                  aria-label={openGroups.has(item.label) ? `Collapse ${item.label}` : `Expand ${item.label}`}
                  className="shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-brand-50 hover:text-brand-700"
                >
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${openGroups.has(item.label) ? "rotate-180" : ""}`}
                  />
                </button>
              )}
            </div>
            {item.children && (
              <AnimatePresence initial={false}>
                {openGroups.has(item.label) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="ml-4 mt-1 space-y-1 border-l border-slate-200 pl-3">
                      {item.children.map((child) => (
                        <NavLink
                          key={child.to}
                          to={child.to}
                          end={child.end}
                          onClick={() => setDrawerOpen(false)}
                          className={({ isActive }) => leafLinkClass(isActive)}
                        >
                          {({ isActive }) => (
                            <>
                              {isActive && (
                                <motion.span
                                  layoutId="active-nav-accent"
                                  className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-gold-400"
                                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                                />
                              )}
                              <child.icon className="h-4 w-4 shrink-0" />
                              {child.label}
                            </>
                          )}
                        </NavLink>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>
        ))}
      </nav>
      <div className="border-t border-slate-100 p-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-maroon-600 transition-colors hover:bg-maroon-50"
        >
          <LogOut className="h-4.5 w-4.5" />
          Logout
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {drawerOpen && (
          // pointerEvents is switched via the animate/exit variants (not just the
          // opacity fade) so that once you tap a nav link, this full-screen overlay
          // stops swallowing taps immediately instead of only after its ~250ms
          // close animation finishes — that gap was eating the next tap on mobile.
          <motion.div
            className="fixed inset-0 z-50 lg:hidden"
            initial={{ pointerEvents: "none" }}
            animate={{ pointerEvents: "auto" }}
            exit={{ pointerEvents: "none" }}
          >
            <motion.div
              className="absolute inset-0 bg-slate-900/50"
              onClick={() => setDrawerOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
            <motion.aside
              className="relative flex h-full w-72 max-w-[80vw] flex-col bg-white shadow-xl"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
            >
              {sidebarContent}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:px-6">
          <div className="flex items-center gap-3">
            <button className="rounded-lg p-2 transition-colors hover:bg-slate-100 lg:hidden" onClick={() => setDrawerOpen(true)}>
              <Menu className="h-5 w-5 text-slate-600" />
            </button>
            <div className="flex items-center gap-2.5">
              <AvatarUploadButton size="h-9 w-9" tone={ROLE_TONE[user?.role ?? ""] ?? "brand"} />
              <div>
                <p className="text-sm font-semibold text-slate-800">{displayName}</p>
                <p className="text-xs text-slate-400">{roleLabel}</p>
              </div>
            </div>
          </div>
          <NotificationBell />
        </header>
        <main className="flex-1 p-4 lg:p-6">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
