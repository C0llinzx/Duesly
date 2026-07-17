"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown, ChevronUp, X, Check } from "lucide-react"
import d from "./mevolut.module.css"

interface OnboardingCheck {
  zones: boolean
  units: boolean
  collections: boolean
}

export default function ShellZone() {
  const pathname = usePathname()
  const [onboardingCheck, setOnboardingCheck] = useState<OnboardingCheck>({ zones: false, units: false, collections: false })
  const [dismissed, setDismissed] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const prevPath = useRef(pathname)

  function check() {
    const ctrl = new AbortController()

    Promise.all([
      fetch("/api/dashboard/zones", { signal: ctrl.signal })
        .then(async (r) => (r.ok ? (await r.json()).zones?.length ?? 0 : 0)),
      fetch("/api/dashboard/units", { signal: ctrl.signal })
        .then(async (r) => (r.ok ? (await r.json()).units?.length ?? 0 : 0)),
      fetch("/api/dashboard/collections", { signal: ctrl.signal })
        .then(async (r) => (r.ok ? (await r.json()).collections?.length ?? 0 : 0)),
    ])
      .then(([zd, ud, cd]) => {
        setOnboardingCheck({ zones: zd > 0, units: ud > 0, collections: cd > 0 })
        setLoaded(true)
      })
      .catch(() => {})

    return ctrl
  }

  useEffect(() => {
    const ctrl = check()
    return () => ctrl.abort()
  }, [])

  // Refetch when navigating back to a dashboard page
  useEffect(() => {
    if (pathname !== prevPath.current) {
      prevPath.current = pathname
      const ctrl = check()
      return () => ctrl.abort()
    }
  }, [pathname])

  const steps = [
    { num: 1, label: "Set up your estate zones", desc: 'Organise your estate — e.g. "Block A", "Phase 2".', href: "/dashboard/members", done: onboardingCheck.zones },
    { num: 2, label: "Add your houses", desc: "Import or add houses one by one.", href: "/dashboard/members", done: onboardingCheck.units },
    { num: 3, label: "Start collecting dues", desc: "Set the amount, share one link.", href: "/dashboard/collections", done: onboardingCheck.collections },
  ]

  const doneCount = steps.filter((s) => s.done).length
  const allDone = doneCount === steps.length
  const hasPending = doneCount < steps.length
  const showWidget = loaded && !dismissed

  if (!showWidget) return null

  return (
    <div className={d.onboardingWidget}>
      {expanded ? (
        <div className={d.onboardingCard}>
          <div className={d.onboardingCardHeader}>
            <span className={d.onboardingCardTitle}>Getting started</span>
            <div className={d.onboardingCardActions}>
              <button
                className={d.onboardingIconBtn}
                onClick={() => setExpanded(false)}
                aria-label="Collapse"
              >
                <ChevronDown size={14} strokeWidth={2} />
              </button>
              <button
                className={d.onboardingIconBtn}
                onClick={() => setDismissed(true)}
                aria-label="Dismiss"
              >
                <X size={14} strokeWidth={2} />
              </button>
            </div>
          </div>
          <div className={d.onboardingSteps}>
            {steps.map((step, i) => {
              const activeIndex = steps.findIndex((s) => !s.done)
              return (
                <Link
                  key={step.num}
                  href={step.href}
                  className={`${d.onboardingStep} ${step.done ? d.onboardingStepDone : ""} ${i === activeIndex ? d.onboardingStepActive : ""}`}
                >
                  <span className={`${d.onboardingStepNum} ${step.done ? d.onboardingStepNumDone : ""} ${i === activeIndex ? d.onboardingStepNumActive : ""}`}>
                    {step.done ? <Check size={10} strokeWidth={3} /> : step.num}
                  </span>
                  <div className={d.onboardingStepContent}>
                    <div className={d.onboardingStepLabel}>{step.label}</div>
                    <div className={d.onboardingStepDesc}>{step.desc}</div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      ) : (
        <div className={`${d.onboardingPill} ${allDone ? d.onboardingPillDone : ""}`}>
          <button className={d.onboardingPillMain} onClick={() => hasPending && setExpanded(true)}>
            {allDone ? <Check size={12} strokeWidth={3} className={d.onboardingPillCheck} />
              : <span className={d.onboardingPillDot} />}
            <span>{allDone ? "Getting started · Complete" : `Getting started · ${doneCount} of 3`}</span>
            {hasPending && <ChevronUp size={14} strokeWidth={2} />}
          </button>
          <button
            className={d.onboardingPillClose}
            onClick={() => setDismissed(true)}
            aria-label="Dismiss"
          >
            <X size={12} strokeWidth={2} />
          </button>
        </div>
      )}
    </div>
  )
}
