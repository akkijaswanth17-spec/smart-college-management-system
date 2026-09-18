import { ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: string;
}

export function Modal({ open, onClose, title, children, maxWidth = "max-w-lg" }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  // A page-content ancestor (PageTransition) animates a transform, which
  // makes descendant `position: fixed` elements relative to that ancestor's
  // box instead of the real viewport — a portal escapes it so the overlay is
  // always positioned against the actual browser window, not page content.
  return createPortal(
    <AnimatePresence>
      {open && (
        // pointerEvents tracks the exit variant (not just opacity) so this overlay
        // stops swallowing taps the instant it starts closing, rather than only
        // after its ~200ms fade-out finishes — see the same fix in DashboardLayout.
        <motion.div
          className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ pointerEvents: "none" }}
          animate={{ pointerEvents: "auto" }}
          exit={{ pointerEvents: "none" }}
        >
          <motion.div
            className="absolute inset-0 bg-brand-950/60 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
          <motion.div
            className={`modal-card relative w-full ${maxWidth} max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-7`}
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 4 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-serif text-lg font-bold text-brand-950">{title}</h2>
              <button
                onClick={onClose}
                className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-brand-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
