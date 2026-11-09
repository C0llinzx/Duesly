"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { X, Check } from "lucide-react"
import d from "../../mevolut.module.css"

interface OweUnit {
  id: string
  label: string
  residentName: string | null
}

interface Props {
  open: boolean
  onClose: () => void
  onToast: (msg: string) => void
  collectionId: string
  owingUnits: OweUnit[]
}

export default function RecordPaymentModal({ open, onClose, onToast, collectionId, owingUnits }: Props) {
  const router = useRouter()
  const [selectedUnitId, setSelectedUnitId] = useState("")
  const [query, setQuery] = useState("")
  const [saving, setSaving] = useState(false)

  if (!open) return null

  const filtered = query.trim()
    ? owingUnits.filter((u) =>
        u.label.toLowerCase().includes(query.toLowerCase()) ||
        (u.residentName ?? "").toLowerCase().includes(query.toLowerCase()),
      )
    : owingUnits

  async function handleSubmit() {
    if (!selectedUnitId || saving) return
    setSaving(true)
    try {
      const res = await fetch(`/api/dashboard/units/${selectedUnitId}/dues`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark-paid", collectionId }),
      })
      const data = await res.json()
      if (res.ok) {
        onToast("Payment recorded")
        setSelectedUnitId("")
        setQuery("")
        onClose()
        router.refresh()
      } else {
        onToast(data.error ?? "Could not record payment")
      }
    } catch {
      onToast("Could not record payment")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={d.remModal} onClick={onClose}>
      <div className={d.remModalCard} onClick={(e) => e.stopPropagation()}>
        <button className={d.remModalClose} onClick={onClose} aria-label="Close">
          <X size={16} />
        </button>

        <div className={d.remModalTitle}>Record offline payment</div>
        <div className={d.remModalDesc}>
          Mark a house as paid for this due — for residents who paid by cash or bank transfer.
        </div>

        {owingUnits.length === 0 ? (
          <div className={d.remModalDesc}>All houses have already paid.</div>
        ) : (
          <>
            <input
              className={d.remSearchInput}
              type="text"
              placeholder="Search by house or resident name…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            <div className={d.remUnitList}>
              {filtered.length === 0 && (
                <div className={d.remModalDesc}>No match found.</div>
              )}
              {filtered.slice(0, 50).map((u) => (
                <button
                  key={u.id}
                  className={`${d.remUnitRow} ${selectedUnitId === u.id ? d.remUnitRowActive : ""}`}
                  onClick={() => setSelectedUnitId(u.id)}
                >
                  <span>{u.label}{u.residentName ? ` — ${u.residentName}` : ""}</span>
                  {selectedUnitId === u.id && <Check size={16} />}
                </button>
              ))}
            </div>
          </>
        )}

        <div className={d.remModalActions}>
          <button className={d.remBtnSecondary} onClick={onClose}>
            Cancel
          </button>
          <button
            className={d.remBtnPrimary}
            onClick={handleSubmit}
            disabled={!selectedUnitId || saving}
          >
            {saving ? "Recording…" : "Mark as paid"}
          </button>
        </div>
      </div>
    </div>
  )
}
