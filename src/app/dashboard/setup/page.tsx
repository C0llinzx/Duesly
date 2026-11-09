"use client"

import { useState, useEffect } from "react"
import { Pencil, Trash2, X, AlertTriangle, CheckCircle2, AlertCircle } from "lucide-react"
import d from "../mevolut.module.css"

interface Zone {
  id: string
  name: string
  _count: { units: number }
}

interface Bank {
  name: string
  code: string
}

interface SettlementInfo {
  configured: boolean
  bankName: string | null
  accountNumber: string | null
  accountName: string | null
}

function PayoutSettings() {
  const [info, setInfo] = useState<SettlementInfo | null>(null)
  const [banks, setBanks] = useState<Bank[]>([])
  const [banksError, setBanksError] = useState("")
  const [bankCode, setBankCode] = useState("")
  const [accountNumber, setAccountNumber] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [successName, setSuccessName] = useState("")

  useEffect(() => {
    fetch("/api/dashboard/settlement")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setInfo(data))
      .catch(() => {})

    fetch("/api/dashboard/settlement/banks")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setBanks(data.banks ?? []))
      .catch(() => setBanksError("Could not load the bank list — try again shortly."))
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!bankCode || !accountNumber) return
    setSaving(true)
    setError("")
    setSuccessName("")
    try {
      const bank = banks.find((b) => b.code === bankCode)
      const res = await fetch("/api/dashboard/settlement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bankCode, bankName: bank?.name ?? "", accountNumber }),
      })
      const data = await res.json()
      if (res.ok) {
        setSuccessName(data.accountName)
        setAccountNumber("")
        const refreshed = await fetch("/api/dashboard/settlement")
        if (refreshed.ok) setInfo(await refreshed.json())
      } else {
        setError(data.error ?? "Could not save payout details")
      }
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={d.setupCard}>
      <h3 className={d.setupCardTitle}>Payouts</h3>

      {info && (
        <span className={`${d.setupStatusBadge} ${info.configured ? d.setupStatusConfigured : d.setupStatusUnconfigured}`}>
          {info.configured ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
          {info.configured ? "Settlement configured" : "Not yet configured — payments aren't settling to your account"}
        </span>
      )}

      {info?.configured && (
        <p className={d.setupHint} style={{ marginBottom: 16 }}>
          Online payments settle to {info.bankName} ending {info.accountNumber} ({info.accountName}). Duesly&apos;s service fee
          is deducted automatically; your estate receives the full due amount.
        </p>
      )}

      <form className={d.setupFormColumn} onSubmit={handleSave}>
        <div>
          <label className={d.setupFieldLabel}>Bank</label>
          <select className={d.setupSelect} value={bankCode} onChange={(e) => setBankCode(e.target.value)} required>
            <option value="">Select a bank…</option>
            {banks.map((b) => (
              <option key={b.code} value={b.code}>{b.name}</option>
            ))}
          </select>
          {banksError && <p className={d.setupErrorText}>{banksError}</p>}
        </div>
        <div>
          <label className={d.setupFieldLabel}>Account number</label>
          <input
            className={d.setupInput}
            style={{ width: "100%" }}
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="0123456789"
            inputMode="numeric"
            required
          />
        </div>
        <button type="submit" className={d.setupPrimaryBtn} disabled={saving || !bankCode || accountNumber.length !== 10}>
          {saving ? "Verifying…" : info?.configured ? "Update payout account" : "Save payout account"}
        </button>
        {error && <p className={d.setupErrorText}>{error}</p>}
        {successName && <p className={d.setupHint}>Verified: paying out to <strong>{successName}</strong>.</p>}
      </form>

      <p className={d.setupHint}>
        This is the estate&apos;s own bank account — Duesly never holds your money. We verify the account name with
        Paystack before saving.
      </p>
    </div>
  )
}

export default function SetupPage() {
  const [zones, setZones] = useState<Zone[]>([])
  const [zoneName, setZoneName] = useState("")
  const [loading, setLoading] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editLoading, setEditLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Zone | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const ctrl = new AbortController()
    fetch("/api/dashboard/zones", { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setZones(data.zones ?? []))
      .catch(() => {})
    return () => ctrl.abort()
  }, [])

  async function reloadZones() {
    const res = await fetch("/api/dashboard/zones")
    if (res.ok) {
      const data = await res.json()
      setZones(data.zones ?? [])
    }
  }

  async function addZone(e: React.FormEvent) {
    e.preventDefault()
    if (!zoneName.trim()) return
    setLoading(true)
    const res = await fetch("/api/dashboard/zones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: zoneName.trim() }),
    })
    if (res.ok) {
      setZoneName("")
      await reloadZones()
    }
    setLoading(false)
  }

  function startEdit(zone: Zone) {
    setEditId(zone.id)
    setEditName(zone.name)
  }

  function cancelEdit() {
    setEditId(null)
    setEditName("")
  }

  async function saveEdit(zoneId: string) {
    if (!editName.trim() || editLoading) return
    setEditLoading(true)
    const res = await fetch(`/api/dashboard/zones`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: zoneId, name: editName.trim() }),
    })
    if (res.ok) {
      setEditId(null)
      setEditName("")
      await reloadZones()
    }
    setEditLoading(false)
  }

  async function confirmDelete() {
    if (!deleteTarget || deleting) return
    setDeleting(true)
    const res = await fetch(`/api/dashboard/zones`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: deleteTarget.id }),
    })
    if (res.ok) {
      setDeleteTarget(null)
      await reloadZones()
    }
    setDeleting(false)
  }

  return (
    <div className={d.setupPage}>
      <header className={d.setupHeader}>
        <h1 className={d.setupTitle}>Estate Setup</h1>
      </header>

      <PayoutSettings />

      {/* Add Zone Card */}
      <div className={d.setupCard}>
        <h3 className={d.setupCardTitle}>Add Zone</h3>
        <form className={d.setupForm} onSubmit={addZone}>
          <input
            className={d.setupInput}
            value={zoneName}
            onChange={(e) => setZoneName(e.target.value)}
            placeholder="Zone name (e.g. Block A)"
            required
          />
          <button type="submit" disabled={loading || !zoneName.trim()} className={d.setupPrimaryBtn}>
            {loading ? "Adding..." : "Add Zone"}
          </button>
        </form>
      </div>

      {/* Zones List */}
      <div className={d.setupTableCard}>
        {zones.length === 0 ? (
          <div className={d.setupEmpty}>
            <p className={d.setupEmptyText}>No zones yet — add your first zone above.</p>
          </div>
        ) : (
          <table className={d.setupTable}>
            <thead>
              <tr>
                <th className={d.setupTh}>Zone Name</th>
                <th className={d.setupTh}>Units</th>
                <th className={`${d.setupTh} ${d.setupThRight}`}>&nbsp;</th>
              </tr>
            </thead>
            <tbody>
              {zones.map((zone) => (
                <tr key={zone.id} className={d.setupTr}>
                  <td className={d.setupTd}>
                    {editId === zone.id ? (
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <input
                          className={d.setupInput}
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit(zone.id)
                            if (e.key === "Escape") cancelEdit()
                          }}
                          autoFocus
                          style={{ height: 32, fontSize: 13, minWidth: 200 }}
                        />
                        <button
                          className={d.setupPrimaryBtn}
                          onClick={() => saveEdit(zone.id)}
                          disabled={editLoading || !editName.trim()}
                          style={{ height: 32, padding: "4px 12px", fontSize: 12 }}
                        >
                          Save
                        </button>
                        <button
                          className={d.setupActionBtn}
                          onClick={cancelEdit}
                          style={{ width: 32, height: 32 }}
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <span className={d.setupZoneName}>{zone.name}</span>
                    )}
                  </td>
                  <td className={d.setupTd}>
                    <span className={d.setupZoneCount}>{zone._count.units} unit{zone._count.units !== 1 ? "s" : ""}</span>
                  </td>
                  <td className={`${d.setupTd} ${d.setupTdRight}`}>
                    <div className={d.setupRowActions}>
                      <button
                        className={d.setupActionLabel}
                        onClick={() => startEdit(zone)}
                      >
                        <Pencil size={12} />
                        Edit
                      </button>
                      <button
                        className={d.setupActionLabel}
                        onClick={() => setDeleteTarget(zone)}
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        <Trash2 size={12} />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Delete confirm modal */}
      {deleteTarget && (
        <div className={d.setupModal} onClick={() => setDeleteTarget(null)}>
          <div className={d.setupModalCard} onClick={(e) => e.stopPropagation()}>
            <button className={d.setupModalClose} onClick={() => setDeleteTarget(null)}>
              <X size={14} />
            </button>
            <div className={d.setupModalIcon}>
              <AlertTriangle size={20} />
            </div>
            <div className={d.setupModalTitle}>Delete &ldquo;{deleteTarget.name}&rdquo;?</div>
            <div className={d.setupModalDesc}>
              This zone and all its units will be permanently removed. This action cannot be undone.
            </div>
            <div className={d.setupModalActions}>
              <button className={d.setupModalCancel} onClick={() => setDeleteTarget(null)}>
                Cancel
              </button>
              <button
                className={d.setupModalConfirm}
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
