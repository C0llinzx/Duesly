"use client"

import { useState, useMemo } from "react"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts"
import { formatNaira, formatCompactNaira } from "@/lib/money"
import d from "./mevolut.module.css"

interface PaymentPoint {
  date: string
  amountKobo: number
}

interface CollectionChartProps {
  paymentHistory: PaymentPoint[]
  collectionCreatedAt: string | null
  target: number
}

type ViewMode = "cumulative" | "received"
type RangeMode = "7d" | "30d" | "all"

const DAY_MS = 86_400_000

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function formatDateLabel(date: Date): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  return `${months[date.getMonth()]} ${date.getDate()}`
}

function formatDateShort(date: Date): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  return `${months[date.getMonth()]} ${date.getDate()}`
}

function addDays(date: Date, n: number): Date {
  return new Date(date.getTime() + n * DAY_MS)
}

function getRangeStart(range: RangeMode, now: Date): Date {
  const today = startOfDay(now)
  switch (range) {
    case "7d":  return addDays(today, -6)
    case "30d": return addDays(today, -29)
    case "all": return today
  }
}

function buildDayBuckets(
  history: PaymentPoint[],
  rangeStart: Date,
  now: Date,
): { date: Date; amountKobo: number; dayKey: string }[] {
  const today = startOfDay(now)
  const totalDays = Math.round((today.getTime() - rangeStart.getTime()) / DAY_MS)
  const buckets: { date: Date; amountKobo: number; dayKey: string }[] = []

  for (let i = 0; i <= totalDays; i++) {
    const d = addDays(rangeStart, i)
    buckets.push({ date: d, amountKobo: 0, dayKey: d.toISOString().slice(0, 10) })
  }

  for (const p of history) {
    const key = p.date.slice(0, 10)
    const b = buckets.find((b) => b.dayKey === key)
    if (b) b.amountKobo += p.amountKobo
  }

  return buckets
}

function buildWeekBuckets(
  history: PaymentPoint[],
  rangeStart: Date,
  now: Date,
): { date: Date; amountKobo: number; dayKey: string }[] {
  const today = startOfDay(now)

  const start = startOfDay(rangeStart)
  const startWeek = new Date(start)
  startWeek.setDate(startWeek.getDate() - startWeek.getDay())

  const buckets: { date: Date; amountKobo: number; dayKey: string }[] = []
  let weekStart = startWeek

  while (weekStart <= today) {
    const weekEnd = addDays(weekStart, 6)
    buckets.push({
      date: new Date(weekStart),
      amountKobo: 0,
      dayKey: weekStart.toISOString().slice(0, 10),
    })
    weekStart = addDays(weekStart, 7)
  }

  for (const p of history) {
    const pDate = startOfDay(new Date(p.date))
    const b = buckets.find((b) => {
      const bEnd = addDays(b.date, 6)
      return pDate >= b.date && pDate <= bEnd
    })
    if (b) b.amountKobo += p.amountKobo
  }

  return buckets
}

function buildMonthBuckets(
  history: PaymentPoint[],
  rangeStart: Date,
  now: Date,
): { date: Date; amountKobo: number; dayKey: string }[] {
  const buckets: { date: Date; amountKobo: number; dayKey: string }[] = []
  let cursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1)
  const today = startOfDay(now)

  while (cursor <= today) {
    buckets.push({
      date: new Date(cursor),
      amountKobo: 0,
      dayKey: `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`,
    })
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
  }

  for (const p of history) {
    const pDate = new Date(p.date)
    const pKey = `${pDate.getFullYear()}-${String(pDate.getMonth() + 1).padStart(2, "0")}`
    const b = buckets.find((b) => b.dayKey === pKey)
    if (b) b.amountKobo += p.amountKobo
  }

  return buckets
}

function buildChartData(
  history: PaymentPoint[],
  collectionCreatedAt: string | null,
  target: number,
  range: RangeMode,
  view: ViewMode,
) {
  if (!collectionCreatedAt) return { points: [], maxVal: target }

  const now = new Date()
  const created = startOfDay(new Date(collectionCreatedAt))
  const rangeStart = getRangeStart(range, now)
  const effectiveStart = created > rangeStart ? created : rangeStart

  const totalDays = Math.round((startOfDay(now).getTime() - effectiveStart.getTime()) / DAY_MS)
  const useWeek = totalDays > 90
  const useMonth = totalDays > 180

  const rawBuckets = useMonth
    ? buildMonthBuckets(history, effectiveStart, now)
    : useWeek
      ? buildWeekBuckets(history, effectiveStart, now)
      : buildDayBuckets(history, effectiveStart, now)

  if (view === "cumulative") {
    let cumulative = 0
    const points = rawBuckets.map((b, i) => {
      cumulative += b.amountKobo
      return {
        label: formatDateShort(b.date),
        value: cumulative,
        raw: b.amountKobo,
        date: b.date,
        isLast: i === rawBuckets.length - 1,
      }
    })
    const maxVal = Math.max(target, points.length > 0 ? points[points.length - 1].value : 0)
    return { points, maxVal }
  }

  const points = rawBuckets.map((b, i) => ({
    label: formatDateShort(b.date),
    value: b.amountKobo,
    raw: b.amountKobo,
    date: b.date,
    isLast: i === rawBuckets.length - 1,
  }))
  const maxVal = points.length > 0 ? Math.max(...points.map((p) => p.value)) : target
  return { points, maxVal }
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className={d.ovChartTooltip}>
      <div className={d.ovChartTooltipLabel}>{label}</div>
      <div className={d.ovChartTooltipValue}>{formatNaira(payload[0].value)}</div>
    </div>
  )
}

function CumulativeEndDot({ cx, cy, payload }: { cx?: number; cy?: number; payload?: { isLast?: boolean } }) {
  if (!payload?.isLast || cx == null || cy == null) return null
  return (
    <circle
      cx={cx}
      cy={cy}
      r={4}
      fill="var(--primary)"
      stroke="var(--surface-card)"
      strokeWidth={2}
    />
  )
}

function EmptyState() {
  return (
    <div className={d.ovChartEmpty}>
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={d.ovChartEmptyIcon}>
        <path d="M3 3v18h18" />
        <path d="M7 16l4-4 4 2 6-6" strokeDasharray="3 3" />
      </svg>
      <span className={d.ovChartEmptyText}>Collection appears here as residents pay</span>
    </div>
  )
}

function Subtext({ collected, target }: { collected: number; target: number }) {
  const rate = target > 0 ? Math.round((collected / target) * 100) : 0
  return (
    <span className={d.ovChartSubtext}>
      <strong>{formatCompactNaira(collected)}</strong> of {formatCompactNaira(target)} · {rate}%
    </span>
  )
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

export default function CollectionChart({
  paymentHistory,
  collectionCreatedAt,
  target,
}: CollectionChartProps) {
  const [view, setView] = useState<ViewMode>("cumulative")
  const [range, setRange] = useState<RangeMode>("30d")

  const { points, maxVal } = useMemo(
    () => buildChartData(paymentHistory, collectionCreatedAt, target, range, view),
    [paymentHistory, collectionCreatedAt, target, range, view],
  )

  const isEmpty = paymentHistory.length === 0 || !collectionCreatedAt || target <= 0
  const totalCollected = useMemo(
    () => paymentHistory.reduce((sum, p) => sum + p.amountKobo, 0),
    [paymentHistory],
  )

  const animationOff = prefersReducedMotion()
  const yDomain: [number, number] = [0, maxVal * 1.12]

  const chartHeight = 200

  const renderChart = () => {
    if (isEmpty) {
      return (
        <div style={{ height: chartHeight, position: "relative" }}>
          <EmptyState />
          <ResponsiveContainer width="100%" height={chartHeight}>
            <AreaChart data={[{ label: "", value: 0 }]} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="0" />
              <XAxis dataKey="label" hide />
              <YAxis domain={[0, target * 1.12]} hide />
              {view === "cumulative" && (
                <ReferenceLine
                  y={target}
                  stroke="var(--text-tertiary)"
                  strokeDasharray="4 3"
                  strokeWidth={1}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )
    }

    if (points.length === 0) {
      return (
        <div style={{ height: chartHeight, position: "relative" }}>
          <EmptyState />
          <ResponsiveContainer width="100%" height={chartHeight}>
            <AreaChart data={[{ label: "", value: 0 }]} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="0" />
              <XAxis dataKey="label" hide />
              <YAxis domain={[0, target * 1.12]} hide />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )
    }

    if (view === "cumulative") {
      return (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <AreaChart data={points} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="0" />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "var(--text-tertiary)", fontWeight: 500 }}
              interval="preserveStartEnd"
              minTickGap={48}
            />
            <YAxis
              domain={yDomain}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "var(--text-tertiary)", fontWeight: 500 }}
              tickFormatter={(v: number) => formatCompactNaira(v)}
              width={56}
              tickCount={4}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: "var(--border-strong)", strokeDasharray: "3 3" }}
            />
            <ReferenceLine
              y={target}
              stroke="var(--text-tertiary)"
              strokeDasharray="4 3"
              strokeWidth={1}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="var(--primary)"
              strokeWidth={2}
              fill="var(--primary)"
              fillOpacity={0.08}
              isAnimationActive={!animationOff}
              animationDuration={600}
              animationEasing="ease-out"
              dot={<CumulativeEndDot />}
              activeDot={{ r: 4, fill: "var(--primary)", stroke: "var(--surface-card)", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )
    }

    return (
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart data={points} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="0" />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "var(--text-tertiary)", fontWeight: 500 }}
            interval="preserveStartEnd"
            minTickGap={48}
          />
          <YAxis
            domain={[0, maxVal * 1.12 || target * 1.12]}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "var(--text-tertiary)", fontWeight: 500 }}
            tickFormatter={(v: number) => formatCompactNaira(v)}
            width={56}
            tickCount={4}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: "var(--primary-subtle)" }}
          />
          <Bar
            dataKey="value"
            fill="var(--primary)"
            fillOpacity={0.7}
            radius={[3, 3, 0, 0]}
            isAnimationActive={!animationOff}
            animationDuration={600}
            animationEasing="ease-out"
          />
        </BarChart>
      </ResponsiveContainer>
    )
  }

  return (
    <div>
      <div className={d.ovChartHeader}>
        <div className={d.ovChartHeaderLeft}>
          <Subtext collected={totalCollected} target={target} />
        </div>
        <div className={d.ovChartControls}>
          <div className={d.ovChartToggle}>
            <button
              className={`${d.ovChartToggleBtn} ${view === "cumulative" ? d.ovChartToggleBtnActive : ""}`}
              onClick={() => setView("cumulative")}
            >
              Cumulative
            </button>
            <button
              className={`${d.ovChartToggleBtn} ${view === "received" ? d.ovChartToggleBtnActive : ""}`}
              onClick={() => setView("received")}
            >
              Received
            </button>
          </div>
          <div className={d.ovChartRange}>
            <button
              className={`${d.ovChartRangeBtn} ${range === "7d" ? d.ovChartRangeBtnActive : ""}`}
              onClick={() => setRange("7d")}
            >
              7d
            </button>
            <button
              className={`${d.ovChartRangeBtn} ${range === "30d" ? d.ovChartRangeBtnActive : ""}`}
              onClick={() => setRange("30d")}
            >
              30d
            </button>
            <button
              className={`${d.ovChartRangeBtn} ${range === "all" ? d.ovChartRangeBtnActive : ""}`}
              onClick={() => setRange("all")}
            >
              All
            </button>
          </div>
        </div>
      </div>
      <div className={d.ovChartBody}>
        {renderChart()}
      </div>
    </div>
  )
}
