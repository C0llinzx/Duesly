"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { CheckCircle, XCircle, AlertTriangle, Info, Loader2, X } from "lucide-react"
import c from "./Toast.module.css"

export interface ToastData {
  id: string
  type: "success" | "error" | "warning" | "info" | "loading"
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
  duration: number
  hovered: boolean
  exited: boolean
}

interface ToastOpts {
  type?: ToastData["type"]
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
  duration?: number
}

interface ToastContextValue {
  toast: (opts: ToastOpts) => string
  dismiss: (id: string) => void
  success: (title: string, opts?: Partial<ToastOpts>) => string
  error: (title: string, opts?: Partial<ToastOpts>) => string
}

const ToastContext = createContext<ToastContextValue | null>(null)

let _counter = 0

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used within ToastProvider")
  return ctx
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([])
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.map((t) => t.id === id ? { ...t, exited: true } : t))
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 200)
    const timer = timers.current.get(id)
    if (timer) { clearTimeout(timer); timers.current.delete(id) }
  }, [])

  const scheduleAutoDismiss = useCallback((id: string, duration: number) => {
    const timer = setTimeout(() => dismiss(id), duration)
    timers.current.set(id, timer)
  }, [dismiss])

  const toast = useCallback((opts: ToastOpts): string => {
    const id = `t-${++_counter}`
    const duration = opts.type === "error" ? 8000 : (opts.duration ?? 5000)
    const data: ToastData = {
      id,
      type: opts.type ?? "success",
      title: opts.title,
      description: opts.description,
      action: opts.action,
      duration,
      hovered: false,
      exited: false,
    }
    setToasts((prev) => [...prev.slice(-4), data])
    scheduleAutoDismiss(id, duration)
    return id
  }, [scheduleAutoDismiss])

  const success = useCallback((title: string, opts?: Partial<ToastOpts>): string => {
    return toast({ ...opts, type: "success", title })
  }, [toast])

  const error = useCallback((title: string, opts?: Partial<ToastOpts>): string => {
    return toast({ ...opts, type: "error", title })
  }, [toast])

  const handleMouseEnter = useCallback((id: string) => {
    setToasts((prev) => prev.map((t) => t.id === id ? { ...t, hovered: true } : t))
    const timer = timers.current.get(id)
    if (timer) { clearTimeout(timer); timers.current.delete(id) }
  }, [])

  const handleMouseLeave = useCallback((id: string) => {
    setToasts((prev) => prev.map((t) => {
      if (t.id !== id) return t
      const timer = setTimeout(() => dismiss(id), t.duration)
      timers.current.set(id, timer)
      return { ...t, hovered: false }
    }))
  }, [dismiss])

  const icons: Record<string, React.ReactNode> = {
    success: <CheckCircle size={16} strokeWidth={2} />,
    error: <XCircle size={16} strokeWidth={2} />,
    warning: <AlertTriangle size={16} strokeWidth={2} />,
    info: <Info size={16} strokeWidth={2} />,
    loading: <Loader2 size={16} strokeWidth={2} className={c.toastSpinner} />,
  }

  const ctx: ToastContextValue = { toast, dismiss, success, error }

  const visibleToasts = toasts.filter((t) => !t.exited || true)

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      {mounted && createPortal(
        <div className={c.toastViewport} aria-label="Notifications">
          {visibleToasts.map((t, i) => (
            <div
              key={t.id}
              className={`${c.toastCard} ${c[t.type]} ${t.exited ? c.toastExit : c.toastEnter}`}
              role={t.type === "error" ? "alert" : "status"}
              aria-live={t.type === "error" ? "assertive" : "polite"}
              onMouseEnter={() => handleMouseEnter(t.id)}
              onMouseLeave={() => handleMouseLeave(t.id)}
              style={{ zIndex: 9999 + i }}
            >
              <div className={c.toastIcon}>
                {icons[t.type]}
              </div>
              <div className={c.toastBody}>
                <div className={c.toastTitle}>{t.title}</div>
                {t.description && <div className={c.toastDesc}>{t.description}</div>}
                {t.action && (
                  <button className={c.toastAction} onClick={t.action.onClick}>
                    {t.action.label}
                  </button>
                )}
              </div>
              <button className={c.toastDismiss} onClick={() => dismiss(t.id)} aria-label="Dismiss">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}
