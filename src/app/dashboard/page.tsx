"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Shield,
} from "lucide-react"
import { formatNaira } from "@/lib/money"
import CollectionChart from "./CollectionChart"
import ActivityFeed from "./ActivityFeed"
import TransactionsWidget from "./TransactionsWidget"
import OwingHousesWidget from "./OwingHousesWidget"
import d from "./mevolut.module.css"

interface DashboardData {
  userName: string
  estateName: string
  collection: { id: string; title: string; amountKobo: number; dueDate: string; slug: string; createdAt: string } | null
  paymentHistory: { date: string; amountKobo: number }[]
  recentPayments: { id: string; amountKobo: number; method: string; paidAt: string; unitLabel: string; residentName: string | null }[]
  zones: { id: string; name: string; units: { id: string; label: string; residentName: string | null; phone1: string | null; paid: boolean; paidAt: string | null }[]; paid: number; total: number }[]
  totalUnits: number
  totalPaid: number
  totalOwing: number
  totalCollected: number
}

interface ActivityItem {
  type: string
  label: string
  description: string
  timestamp: string
}

interface StatCardProps {
  label: string
  trend?: "up" | "down" | null
  support: React.ReactNode
  children: React.ReactNode
}

function StatCard({ label, trend: _trend, support, children, filled }: StatCardProps & { filled?: boolean }) {
  return (
    <div className={`${d.ovCard}${filled ? ` ${d.ovCardFilled}` : ""}`}>
      <span className={d.ovCardLabel}>{label}</span>
      {children}
      <div className={d.ovCardSupport}>{support}</div>
    </div>
  )
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    const ctrl = new AbortController()

    Promise.all([
      fetch("/api/dashboard/overview", { signal: ctrl.signal })
        .then(async (r) => {
          if (!r.ok) throw new Error("not ok")
          return r.json() as Promise<DashboardData>
        }),
      fetch("/api/dashboard/overview/activity", { signal: ctrl.signal })
        .then(async (r) => (r.ok ? ((await r.json()).activity ?? []) : [])),
    ])
      .then(([overview, activity]) => {
        if (cancelled) return
        setData(overview)
        setActivityItems(activity)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoaded(true)
      })

    return () => { cancelled = true; ctrl.abort() }
  }, [])

  if (!loaded) return null

  const hasUnits = (data?.totalUnits ?? 0) > 0
  const totalCollected = data?.totalCollected ?? 0
  const totalOwing = data?.totalOwing ?? 0
  const totalPaid = data?.totalPaid ?? 0
  const totalUnits = data?.totalUnits ?? 0
  const amountPerHouse = data?.collection?.amountKobo ?? 0
  const outstandingAmount = totalOwing * amountPerHouse
  const expectedTotal = totalCollected + outstandingAmount
  const collectionRate = expectedTotal > 0
    ? Math.round((totalCollected / expectedTotal) * 100)
    : 0

  const owingHouses = (data?.zones ?? [])
    .flatMap((z) => z.units)
    .filter((u) => !u.paid)
    .map((u) => ({ id: u.id, label: u.label, residentName: u.residentName }))

  return (
    <div className={d.mainArea}>
      {/* ── Page Header ── */}
      <header className={d.pageHeader}>
        <div className={d.pageHeaderLeft}>
          <h1 className={d.pageTitle}>Overview</h1>
        </div>
        {hasUnits && (
          <Link href="/dashboard/collections?create=true" className={`${d.primaryBtn} ${d.headerBtn}`}>
            New due
          </Link>
        )}
      </header>

      {/* ── Widget Grid ── */}
      <div className={d.overview}>
        {/* Stat grid — 4 live cards */}
        <div className={d.statGrid4}>
          <StatCard label="Collected" trend={null} support={<>{collectionRate}% of target</>} filled>
            <span className={d.ovStatValue}>{formatNaira(totalCollected)}</span>
          </StatCard>

          <StatCard label="Outstanding" trend={null} support={<>{expectedTotal > 0 ? Math.round((outstandingAmount / expectedTotal) * 100) : 0}% remaining</>} filled>
            <span className={d.ovStatValue}>{formatNaira(outstandingAmount)}</span>
          </StatCard>

          <StatCard label="Houses paid" trend={null} filled support={
            <>
              {totalOwing > 0 && <span className={d.ovCardSupportDot} />}
              {totalOwing > 0 ? `${totalOwing} still owing` : 'All houses paid'}
            </>
          }>
            <span className={d.ovStatValue}>
              {totalPaid}<span className={d.ovStatMuted}> / {totalUnits}</span>
            </span>
          </StatCard>

          <StatCard label="Collection rate" trend={null} filled support={
            <>
              <div className={d.ovCardSupportBar}>
                <div className={d.ovCardSupportBarFill} style={{ width: `${collectionRate}%` }} />
              </div>
              <span>{totalPaid} of {totalUnits} houses</span>
            </>
          }>
            <span className={d.ovStatValue}>{collectionRate}%</span>
          </StatCard>
        </div>

        {/* ── Active Levies Banner ── */}
        <div className={`${d.ovCard} ${d.ovLevyBanner}`}>
          {data?.collection ? (() => {
            const col = data.collection
            const due = new Date(col.dueDate + "T12:00:00")
            const now = new Date()
            const daysLeft = Math.max(0, Math.ceil((due.getTime() - now.getTime()) / 86400000))
            const validDays = !isNaN(daysLeft) && isFinite(daysLeft)
            const paidPct = totalUnits > 0 ? Math.round((totalPaid / totalUnits) * 100) : 0
            return (
              <div className={d.ovLevyRow}>
                <div className={d.ovLevyLeft}>
                  <div className={d.ovLevyIcon}><Shield size={16} /></div>
                  <div className={d.ovLevyInfo}>
                    <span className={d.ovLevyName}>{col.title}</span>
                    <span className={d.ovLevyMeta}>
                      {formatNaira(col.amountKobo)} per house · {validDays ? `Due in ${daysLeft} days` : `Due ${new Date(col.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`}
                    </span>
                  </div>
                </div>
                <div className={d.ovLevyRight}>
                  <span className={`${d.ovLevyPill} ${d.ovLevyPillPaid}`}>{totalPaid} paid</span>
                  <span className={`${d.ovLevyPill} ${d.ovLevyPillOwing}`}>{totalOwing} owing</span>
                  <div className={d.ovLevyProgress}>
                    <div className={d.ovLevyProgressFill} style={{ width: `${paidPct}%` }} />
                  </div>
                </div>
              </div>
            )
          })() : (
            <div className={d.ovLevyEmpty}>
              <span className={d.ovLevyEmptyText}>No active dues</span>
              <Link href="/dashboard/collections?create=true" className={d.ovLevyAction}>New due</Link>
            </div>
          )}
        </div>

        {/* Row A — Collection over time (2fr) | Recent activity (1fr) */}
        <div className={d.rowSplit}>
          <div className={`${d.ovCard} ${d.ovCardFilled}`}>
            <span className={d.sectionHeader}>Collection over time</span>
            <CollectionChart
              paymentHistory={data?.paymentHistory ?? []}
              collectionCreatedAt={data?.collection?.createdAt ?? null}
              target={expectedTotal}
            />
          </div>
          <div className={d.ovCard}>
            <span className={d.sectionHeader}>Recent activity</span>
            <ActivityFeed items={activityItems.slice(0, 5)} />
          </div>
        </div>

        {/* Row B — Recent transactions (2fr) | Top owing houses (1fr) */}
        <div className={d.rowSplit}>
          <div className={`${d.ovCard} ${d.ovCardFilled}`}>
            <div className={d.ovActivityHeader}>
              <span className={d.sectionHeader}>Recent transactions</span>
              <Link href="/dashboard/payments" className={d.ovActivityViewAll}>View all →</Link>
            </div>
            <TransactionsWidget
              transactions={data?.recentPayments ?? []}
              paymentLinkSlug={data?.collection?.slug ?? null}
            />
          </div>
          <div className={d.ovCard}>
            <OwingHousesWidget
              owingHouses={owingHouses}
              totalOwing={totalOwing}
              collectionId={data?.collection?.id ?? null}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
