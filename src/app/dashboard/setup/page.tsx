"use client"

import { useState, useEffect } from "react"
import { Pencil, Trash2, X, AlertTriangle } from "lucide-react"
import d from "../mevolut.module.css"

interface Zone {
  id: string
  name: string
  _count: { units: number }
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
