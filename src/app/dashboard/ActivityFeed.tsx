"use client"

import { Banknote, Home, Bell, Megaphone, Clock } from "lucide-react"
import d from "./mevolut.module.css"

interface ActivityItem {
  type: string
  label: string
  description: string
  timestamp: string
}

interface ActivityFeedProps {
  items: ActivityItem[]
}

const ICON_MAP: Record<string, typeof Banknote> = {
  payment: Banknote,
  offline_payment: Banknote,
  house_added: Home,
  reminder: Bell,
  levy_created: Megaphone,
}

function relativeTime(iso: string): string {
  const now = Date.now()
  const then = new Date(iso).getTime()
  const diffSec = Math.floor((now - then) / 1000)

  if (diffSec < 60) return "just now"
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay === 1) return "yesterday"
  if (diffDay < 30) return `${diffDay}d ago`
  const diffMonth = Math.floor(diffDay / 30)
  return `${diffMonth}mo ago`
}

export default function ActivityFeed({ items }: ActivityFeedProps) {
  if (items.length === 0) {
    return <div className={d.ovActivityEmpty}>No activity yet.</div>
  }

  return (
    <div className={d.ovActivityList}>
      {items.map((item, i) => {
        const Icon = ICON_MAP[item.type] ?? Clock
        return (
          <div key={`${item.type}-${i}`} className={d.ovActivityItem}>
            <span className={d.ovActivityIcon}><Icon size={14} /></span>
            <div className={d.ovActivityContent}>
              <span className={d.ovActivityLabel}>{item.description}</span>
            </div>
            <span className={d.ovActivityTime}>{relativeTime(item.timestamp)}</span>
          </div>
        )
      })}
    </div>
  )
}
