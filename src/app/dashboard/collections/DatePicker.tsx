"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { ChevronLeft, ChevronRight } from "lucide-react"
import d from "../mevolut.module.css"

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function startDay(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

function toISODate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

function formatDisplay(year: number, month: number, day: number) {
  const d = new Date(year, month, day)
  return d.toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
}

export default function DatePicker({ value, onChange, compact }: { value: string; onChange: (iso: string) => void; compact?: boolean }) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  const selected = value ? new Date(value + "T12:00:00") : new Date()
  const [viewYear, setViewYear] = useState(selected.getFullYear())
  const [viewMonth, setViewMonth] = useState(selected.getMonth())

  const today = new Date()
  const todayYear = today.getFullYear()
  const todayMonth = today.getMonth()
  const todayDay = today.getDate()

  const selYear = selected.getFullYear()
  const selMonth = selected.getMonth()
  const selDay = selected.getDate()

  const dim = daysInMonth(viewYear, viewMonth)
  const start = startDay(viewYear, viewMonth)

  // Sync calendar view when value changes
  useEffect(() => {
    if (value) {
      const d = new Date(value + "T12:00:00")
      setViewYear(d.getFullYear())
      setViewMonth(d.getMonth())
    }
  }, [value])

  // Position the popover
  useEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const calHeight = 280
      const spaceBelow = window.innerHeight - rect.bottom
      const top = spaceBelow >= calHeight + 8 ? rect.bottom + 6 : rect.top - calHeight - 6
      setPos({
        top: Math.max(8, Math.min(top, window.innerHeight - calHeight - 8)),
        left: Math.max(8, Math.min(rect.left, window.innerWidth - 268)),
      })
    }
  }, [open])

  const prevMonth = useCallback(() => {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11) }
    else setViewMonth((m) => m - 1)
  }, [viewMonth])

  const nextMonth = useCallback(() => {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0) }
    else setViewMonth((m) => m + 1)
  }, [viewMonth])

  function handleSelect(day: number) {
    onChange(toISODate(viewYear, viewMonth, day))
    setOpen(false)
  }

  const displayDate = value ? formatDisplay(selYear, selMonth, selDay) : ""

  return (
    <div className={`${d.dpWrap} ${compact ? d.dpWrapCompact : ""}`}>
      <button
        ref={triggerRef}
        type="button"
        className={`${d.dpTrigger} ${compact ? d.dpTriggerCompact : ""}`}
        onClick={() => setOpen((p) => !p)}
        aria-label="Pick a date"
      >
        <span className={d.dpTriggerText}>{displayDate || "Select date"}</span>
      </button>

      {open && createPortal(
        <>
          <div className={d.dpBackdrop} onClick={() => setOpen(false)} />
          <div className={d.dpCal} style={{ position: "fixed", top: pos.top, left: pos.left }}>
            <div className={d.dpCalHeader}>
              <button type="button" className={d.dpNavBtn} onClick={prevMonth} aria-label="Previous month">
                <ChevronLeft size={14} strokeWidth={2} />
              </button>
              <span className={d.dpCalTitle}>{MONTHS[viewMonth]} {viewYear}</span>
              <button type="button" className={d.dpNavBtn} onClick={nextMonth} aria-label="Next month">
                <ChevronRight size={14} strokeWidth={2} />
              </button>
            </div>
            <div className={d.dpGrid}>
              {WEEKDAYS.map((wd) => (
                <div key={wd} className={d.dpWeekday}>{wd}</div>
              ))}
              {Array.from({ length: start }).map((_, i) => (
                <div key={`e-${i}`} className={d.dpEmpty} />
              ))}
              {Array.from({ length: dim }).map((_, i) => {
                const day = i + 1
                const isToday = viewYear === todayYear && viewMonth === todayMonth && day === todayDay
                const isSelected = viewYear === selYear && viewMonth === selMonth && day === selDay
                return (
                  <button
                    key={day}
                    type="button"
                    className={`${d.dpDay} ${isToday ? d.dpDayToday : ""} ${isSelected ? d.dpDaySelected : ""}`}
                    onClick={() => handleSelect(day)}
                  >
                    {day}
                  </button>
                )
              })}
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  )
}
