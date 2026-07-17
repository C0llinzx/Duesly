"use client"

import { useEffect, useRef, useCallback, type ReactNode } from "react"
import { X } from "lucide-react"
import d from "./RightDrawer.module.css"

interface DrawerFooterAction {
  label: string
  onClick: () => void
  variant?: "primary" | "secondary"
  disabled?: boolean
  loading?: boolean
}

interface Props {
  open: boolean
  title: string
  onClose: () => void
  footer?: DrawerFooterAction[]
  children: ReactNode
}

export default function RightDrawer({ open, title, onClose, footer, children }: Props) {
  const drawerRef = useRef<HTMLDivElement>(null)
  const titleId = useRef(`drawer-title-${Math.random().toString(36).slice(2, 8)}`).current

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault()
      onClose()
    }
    if (e.key === "Tab" && drawerRef.current) {
      const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }, [onClose])

  useEffect(() => {
    if (!open) return
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [open, handleKeyDown])

  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => {
      const first = drawerRef.current?.querySelector<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      first?.focus()
    }, 50)
    return () => clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    return () => { prev?.focus() }
  }, [open])

  if (!open) return null

  return (
    <div className={d.drawerScrim} onClick={onClose} aria-hidden="true">
      <div
        ref={drawerRef}
        className={d.drawerPanel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={d.drawerHeader}>
          <h2 id={titleId} className={d.drawerTitle}>{title}</h2>
          <button className={d.drawerClose} onClick={onClose} aria-label="Close drawer">
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        <div className={d.drawerBody}>
          {children}
        </div>

        {footer && footer.length > 0 && (
          <div className={d.drawerFooter}>
            {footer.map((action) => (
              <button
                key={action.label}
                className={action.variant === "primary" ? d.drawerBtnPrimary : d.drawerBtnSecondary}
                onClick={action.onClick}
                disabled={action.disabled || action.loading}
              >
                {action.loading ? "Saving…" : action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
