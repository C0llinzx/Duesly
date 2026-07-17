"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import s from "@/components/shared.module.css"

interface Zone {
  id: string
  name: string
  units: Unit[]
}

interface Unit {
  id: string
  label: string
  residentName: string | null
  phone1: string | null
  phone2: string | null
  residentEmail: string | null
  occupancyType: string | null
  status: string
}

interface CsvRow {
  zone: string
  unit: string
  residentName?: string
  phone1?: string
  phone2?: string
  email?: string
}

interface EditForm {
  unitId: string
  zoneId: string
  label: string
  residentName: string
  phone1: string
  phone2: string
  residentEmail: string
  occupancyType: string
  status: string
}

export default function RosterPage() {
  const [zones, setZones] = useState<Zone[]>([])
  const [csvRows, setCsvRows] = useState<CsvRow[] | null>(null)
  const [csvErrors, setCsvErrors] = useState<{ row: number; message: string }[]>([])
  const [csvImporting, setCsvImporting] = useState(false)
  const [csvResult, setCsvResult] = useState<{ inserted: number; updated: number } | null>(null)
  const [editingUnit, setEditingUnit] = useState<EditForm | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState({ zoneId: "", label: "", residentName: "", phone1: "", phone2: "", residentEmail: "", occupancyType: "owner" })
  const [addingUnit, setAddingUnit] = useState(false)

  async function loadUnits() {
    const res = await fetch("/api/dashboard/units")
    if (res.ok) {
      const data = await res.json()
      setZones(data.zones ?? [])
    }
  }

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/dashboard/units")
      if (res.ok) {
        const data = await res.json()
        setZones(data.zones ?? [])
      }
    })()
  }, [])

  async function handleCsvPreview(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvResult(null)

    const formData = new FormData()
    formData.append("file", file)

    const res = await fetch("/api/dashboard/csv-preview", {
      method: "POST",
      body: formData,
    })

    if (res.ok) {
      const data = await res.json()
      setCsvRows(data.rows)
      setCsvErrors(data.errors)
    }
  }

  async function handleCsvImport() {
    const fileInput = document.getElementById("csv-file") as HTMLInputElement
    const file = fileInput?.files?.[0]
    if (!file) return

    setCsvImporting(true)
    const formData = new FormData()
    formData.append("file", file)

    const res = await fetch("/api/dashboard/csv-import", {
      method: "POST",
      body: formData,
    })

    if (res.ok) {
      const data = await res.json()
      setCsvResult(data)
      setCsvRows(null)
      await loadUnits()
    } else {
      const data = await res.json()
      setCsvErrors(data.errors ?? [{ row: 0, message: data.error }])
    }

    setCsvImporting(false)
  }

  function startEdit(unit: Unit, zoneId: string) {
    setEditingUnit({
      unitId: unit.id,
      zoneId,
      label: unit.label,
      residentName: unit.residentName ?? "",
      phone1: unit.phone1 ?? "",
      phone2: unit.phone2 ?? "",
      residentEmail: unit.residentEmail ?? "",
      occupancyType: unit.occupancyType ?? "owner",
      status: unit.status,
    })
  }

  async function saveEdit() {
    if (!editingUnit) return
    setSavingEdit(true)
    const res = await fetch(`/api/dashboard/units/${editingUnit.unitId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        residentName: editingUnit.residentName || null,
        phone1: editingUnit.phone1 || null,
        phone2: editingUnit.phone2 || null,
        residentEmail: editingUnit.residentEmail || null,
        occupancyType: editingUnit.occupancyType,
        status: editingUnit.status,
      }),
    })
    if (res.ok) {
      setEditingUnit(null)
      await loadUnits()
    }
    setSavingEdit(false)
  }

  async function addUnit(e: React.FormEvent) {
    e.preventDefault()
    if (!addForm.zoneId || !addForm.label.trim()) return
    setAddingUnit(true)
    const res = await fetch("/api/dashboard/units", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addForm),
    })
    if (res.ok) {
      setAddForm({ zoneId: "", label: "", residentName: "", phone1: "", phone2: "", residentEmail: "", occupancyType: "owner" })
      setShowAddForm(false)
      await loadUnits()
    }
    setAddingUnit(false)
  }

  function updateEdit(field: string, value: string) {
    if (!editingUnit) return
    setEditingUnit({ ...editingUnit, [field]: value })
  }

  return (
    <div>
      <h1>Roster</h1>

      <h2>Import from CSV</h2>
      <div className={s.cardFlat} style={{ marginBottom: 24 }}>
        <input id="csv-file" type="file" accept=".csv,.tsv,.txt" onChange={handleCsvPreview} style={{ marginBottom: 12 }} />
        <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>Expected columns: Zone, House, Name, Phone1, Phone2, Email</p>

        {csvErrors.length > 0 && (
          <div className={s.errorBox} style={{ marginTop: 12 }}>
            <strong>{csvErrors.length} row(s) with errors:</strong>
            <ul style={{ margin: "4px 0 0", fontSize: 13 }}>
              {csvErrors.map((e, i) => (
                <li key={i}>Row {e.row}: {e.message}</li>
              ))}
            </ul>
          </div>
        )}

        {csvRows && (
          <div style={{ marginTop: 12 }}>
            <p><strong>{csvRows.length}</strong> valid rows ready to import</p>
            <button onClick={handleCsvImport} disabled={csvImporting} className={s.btnPrimary}>
              {csvImporting ? "Importing..." : "Confirm Import"}
            </button>
          </div>
        )}

        {csvResult && (
          <div style={{ marginTop: 12, padding: 12, background: "#f0fdf4", borderRadius: 8, color: "#166534" }}>
            Import complete — {csvResult.inserted} new, {csvResult.updated} updated.
          </div>
        )}
      </div>

      <div className={s.flexBetween} style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Houses by Zone</h2>
        <button onClick={() => setShowAddForm(!showAddForm)} className={s.btnPrimary}>
          {showAddForm ? "Cancel" : "Add House"}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={addUnit} className={s.cardFlat} style={{ marginBottom: 24 }}>
          <div className={s.flexRow}>
            <select value={addForm.zoneId} onChange={(e) => setAddForm({ ...addForm, zoneId: e.target.value })} required className={s.select}>
              <option value="">Select zone</option>
              {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select>
            <input value={addForm.label} onChange={(e) => setAddForm({ ...addForm, label: e.target.value })} placeholder="House label" required className={s.input} style={{ width: 100 }} />
            <input value={addForm.residentName} onChange={(e) => setAddForm({ ...addForm, residentName: e.target.value })} placeholder="Resident name" className={s.input} />
            <input value={addForm.phone1} onChange={(e) => setAddForm({ ...addForm, phone1: e.target.value })} placeholder="Phone" className={s.input} />
            <button type="submit" disabled={addingUnit} className={s.btnPrimary}>
              {addingUnit ? "Adding..." : "Add"}
            </button>
          </div>
        </form>
      )}

      {editingUnit && (
        <div className={s.editPanel}>
          <h3 style={{ margin: "0 0 12px" }}>Edit House {editingUnit.label}</h3>
          <div className={s.flexRow}>
            <input value={editingUnit.residentName} onChange={(e) => updateEdit("residentName", e.target.value)} placeholder="Resident name" className={s.input} />
            <input value={editingUnit.phone1} onChange={(e) => updateEdit("phone1", e.target.value)} placeholder="Phone 1" className={s.input} />
            <input value={editingUnit.phone2} onChange={(e) => updateEdit("phone2", e.target.value)} placeholder="Phone 2" className={s.input} />
            <input value={editingUnit.residentEmail} onChange={(e) => updateEdit("residentEmail", e.target.value)} placeholder="Email" className={s.input} />
            <select value={editingUnit.occupancyType} onChange={(e) => updateEdit("occupancyType", e.target.value)} className={s.select}>
              <option value="owner">Owner</option>
              <option value="renter">Renter</option>
            </select>
            <select value={editingUnit.status} onChange={(e) => updateEdit("status", e.target.value)} className={s.select}>
              <option value="active">Active</option>
              <option value="exempt">Exempt</option>
              <option value="inactive">Inactive</option>
            </select>
            <button onClick={saveEdit} disabled={savingEdit} className={s.btnPrimary}>
              {savingEdit ? "Saving..." : "Save"}
            </button>
            <button onClick={() => setEditingUnit(null)} className={s.btnSecondary}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {zones.length === 0 ? (
        <p>No zones yet. <Link href="/dashboard/setup">Add zones</Link> first, then import your roster.</p>
      ) : (
        zones.map((zone) => (
          <div key={zone.id} style={{ marginBottom: 24 }}>
            <h3>{zone.name} ({zone.units.length} houses)</h3>
            {zone.units.length === 0 ? (
              <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>No houses in this zone.</p>
            ) : (
              <table className={s.table}>
                <thead>
                  <tr><th>House</th><th>Resident</th><th>Phone 1</th><th>Phone 2</th><th>Email</th><th>Type</th><th>Status</th><th></th></tr>
                </thead>
                <tbody>
                  {zone.units.map((u) => (
                    <tr key={u.id} style={{ opacity: u.status === "inactive" ? 0.4 : 1 }}>
                      <td style={{ fontWeight: 600 }}>{u.label}</td>
                      <td>{u.residentName ?? "—"}</td>
                      <td>{u.phone1 ?? "—"}</td>
                      <td>{u.phone2 ?? "—"}</td>
                      <td>{u.residentEmail ?? "—"}</td>
                      <td>{u.occupancyType ?? "—"}</td>
                      <td>{u.status}</td>
                      <td>
                        <button onClick={() => startEdit(u, zone.id)} className={s.btnSmall}>Edit</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))
      )}
    </div>
  )
}
