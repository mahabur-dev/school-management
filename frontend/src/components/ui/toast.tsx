"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppIcon } from "./app-icon";
import styles from "./toast.module.css";

type ToastTone = "success" | "error" | "info";
type Toast = { id: number; message: string; tone: ToastTone } | null;
type ToastOptions = { duration?: number };

type ToastContextValue = {
  show: (message: string, tone?: ToastTone, options?: ToastOptions) => void;
  success: (message: string, options?: ToastOptions) => void;
  error: (message: string, options?: ToastOptions) => void;
  info: (message: string, options?: ToastOptions) => void;
  dismiss: () => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);
const DEFAULT_DURATION = 4_000;

/** Global, auto-dismissing feedback for completed actions and transient errors. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    setToast(null);
  }, []);

  const show = useCallback(
    (message: string, tone: ToastTone = "info", options: ToastOptions = {}) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      const id = Date.now();
      setToast({ id, message, tone });
      timeoutRef.current = setTimeout(() => {
        setToast((current) => (current?.id === id ? null : current));
        timeoutRef.current = null;
      }, options.duration ?? DEFAULT_DURATION);
    },
    [],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      show,
      success: (message, options) => show(message, "success", options),
      error: (message, options) => show(message, "error", options),
      info: (message, options) => show(message, "info", options),
      dismiss,
    }),
    [dismiss, show],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <div className={styles.region} aria-live="polite" aria-atomic="true">
          <div
            className={`${styles.toast} ${styles[toast.tone]}`}
            role={toast.tone === "error" ? "alert" : "status"}
          >
            <span className={styles.icon}>
              <AppIcon
                name={
                  toast.tone === "success"
                    ? "check"
                    : toast.tone === "error"
                      ? "x"
                      : "bell"
                }
              />
            </span>
            <p>{toast.message}</p>
            <button
              type="button"
              aria-label="Dismiss message"
              onClick={dismiss}
            >
              <AppIcon name="x" />
            </button>
          </div>
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}
