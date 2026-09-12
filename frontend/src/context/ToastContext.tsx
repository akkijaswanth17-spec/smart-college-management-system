import { createContext, useCallback, useContext, useState, ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, XCircle, X, Bell } from "lucide-react";

interface Toast {
  id: number;
  type: "success" | "error" | "info";
  title?: string;
  message: string;
}

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

let idCounter = 0;

const STYLES = {
  success: { border: "border-emerald-200", bg: "bg-emerald-50", text: "text-emerald-800", icon: CheckCircle2, iconColor: "text-emerald-600" },
  error: { border: "border-red-200", bg: "bg-red-50", text: "text-red-800", icon: XCircle, iconColor: "text-red-600" },
  info: { border: "border-brand-200", bg: "bg-brand-50", text: "text-brand-900", icon: Bell, iconColor: "text-brand-600" },
} as const;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((type: Toast["type"], message: string, title?: string) => {
    const id = ++idCounter;
    setToasts((prev) => [...prev, { id, type, message, title }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 6000);
  }, []);

  const success = useCallback((message: string) => push("success", message), [push]);
  const error = useCallback((message: string) => push("error", message), [push]);
  const info = useCallback((message: string, title?: string) => push("info", message, title), [push]);

  return (
    <ToastContext.Provider value={{ success, error, info }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
        <AnimatePresence>
          {toasts.map((t) => {
            const style = STYLES[t.type];
            const Icon = style.icon;
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, x: 40, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, scale: 0.95 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className={`pointer-events-auto flex items-start gap-2.5 rounded-xl border px-4 py-3 shadow-lg ${style.border} ${style.bg}`}
              >
                <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${style.iconColor}`} />
                <div className={`flex-1 text-sm ${style.text}`}>
                  {t.title && <p className="font-semibold">{t.title}</p>}
                  <p className="whitespace-pre-line">{t.message}</p>
                </div>
                <button
                  onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
                  className="text-slate-400 transition hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
