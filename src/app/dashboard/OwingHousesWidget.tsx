"use client"

import { useState, useCallback } from "react"
import { Bell, X, AlertTriangle } from "lucide-react"
import { useToast } from "@/components/ToastProvider"
import d from "./mevolut.module.css"

interface OwingUnit {
  id: string
  label: string
  residentName: string | null
}

interface OwingHousesWidgetProps {
  owingHouses: OwingUnit[]
  totalOwing: number
  collectionId: string | null
}

const REMIND_COOLDOWN_MS = 60_000

export default function OwingHousesWidget({ owingHouses, totalOwing, collectionId }: OwingHousesWidgetProps) {
  const [showModal, setShowModal] = useState(false)
  const [bulkSending, setBulkSending] = useState(false)
  const [remindedAt, setRemindedAt] = useState<Record<string, number>>({})
  const { success } = useToast()

  const isRateLimited = useCallback((unitId: string) => {
    const lastSent = remindedAt[unitId]
    if (!lastSent) return false
    return Date.now() - lastSent < REMIND_COOLDOWN_MS
  }, [remindedAt])

  const markReminded = useCallback((unitId: string) => {
    setRemindedAt((prev) => ({ ...prev, [unitId]: Date.now() }))
  }, [])

  const handleRemindOne = useCallback(async (unitId: string, unitLabel: string) => {
    if (!collectionId || isRateLimited(unitId)) return
    try {
      const res = await fetch("/api/dashboard/send-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectionId, unitId }),
      })
      if (res.ok) {
        markReminded(unitId)
        success(`Reminder sent to ${unitLabel}`)
      }
    } catch { /* silent */ }
  }, [collectionId, isRateLimited, markReminded, success])

  const handleRemindAll = useCallback(async () => {
    if (!collectionId || bulkSending) return
    setBulkSending(true)
    try {
      const res = await fetch("/api/dashboard/send-reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectionId }),
      })
      if (res.ok) {
        const data = await res.json()
        setShowModal(false)
        success(`Reminders sent to ${data.sent ?? totalOwing} houses`)
        for (const h of owingHouses) markReminded(h.id)
      }
    } catch { /* silent */ }
    setBulkSending(false)
  }, [collectionId, bulkSending, totalOwing, owingHouses, markReminded, success])

  if (owingHouses.length === 0) {
    return <div className={d.ovOwingEmpty}>No houses owing 🎉 everyone&apos;s paid.</div>
  }

  const displayHouses = owingHouses.slice(0, 5)
  const remaining = totalOwing - displayHouses.length

  return (
    <>
      <div className={d.ovOwingHeader}>
        <div className={d.ovOwingHeaderLeft}>
          <span className={d.sectionHeader}>Top owing houses</span>
          <span className={d.ovOwingBadge}>{totalOwing}</span>
        </div>
        <button
          className={d.ovOwingRemindAll}
          onClick={() => setShowModal(true)}
        >
          Remind all owing
        </button>
      </div>

      <div className={d.ovOwingList}>
        {displayHouses.map((house) => {
          const rateLimited = isRateLimited(house.id)
          return (
            <div key={house.id} className={d.ovOwingRow}>
              <div className={d.ovOwingLeft}>
                <span className={d.ovOwingUnit}>{house.label}</span>
                {house.residentName && <span className={d.ovOwingName}> · {house.residentName}</span>}
              </div>
              <div className={d.ovOwingRight}>
                <button
                  className={`${d.ovOwingRemind} ${rateLimited ? d.ovOwingRemindDisabled : ""}`}
                  onClick={() => handleRemindOne(house.id, house.label)}
                  disabled={rateLimited}
                  title={rateLimited ? "Already sent recently" : "Send reminder"}
                >
                  <Bell size={12} />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {remaining > 0 && (
        <div className={d.ovOwingFooter}>
          +{remaining} more houses still owing →
        </div>
      )}

      {/* Bulk confirm modal */}
      {showModal && (
        <div className={d.ovOwingModal} onClick={() => setShowModal(false)}>
          <div className={d.ovOwingModalCard} onClick={(e) => e.stopPropagation()}>
            <button className={d.ovOwingModalClose} onClick={() => setShowModal(false)}>
              <X size={14} />
            </button>
            <div className={d.ovOwingModalIcon}>
              <AlertTriangle size={20} />
            </div>
            <div className={d.ovOwingModalTitle}>Send {totalOwing} reminders?</div>
            <div className={d.ovOwingModalDesc}>
              This will send an email reminder to every house that hasn&apos;t paid yet. This action cannot be undone.
            </div>
            <div className={d.ovOwingModalActions}>
              <button className={d.ovOwingModalCancel} onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button
                className={d.ovOwingModalConfirm}
                onClick={handleRemindAll}
                disabled={bulkSending}
              >
                {bulkSending ? "Sending…" : `Send ${totalOwing} reminders`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
