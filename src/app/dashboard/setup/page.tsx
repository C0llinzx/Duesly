"use client"

import { useState, useEffect } from "react"
import s from "@/components/shared.module.css"

interface Zone {
  id: string
  name: string
  _count: { units: number }
}

export default function SetupPage() {
  const [zones, setZones] = useState<Zone[]>([])
  const [zoneName, setZoneName] = useState("")
  const [loading, setLoading] = useState(false)

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

  return (
    <div>
      <h1>Estate Setup</h1>

      <h2>Add Zone</h2>
      <form onSubmit={addZone} className={s.flexRow} style={{ marginBottom: 24 }}>
        <input value={zoneName} onChange={(e) => setZoneName(e.target.value)} placeholder="Zone name (e.g. Block A)" required className={s.input} style={{ flex: 1 }} />
        <button type="submit" disabled={loading} className={s.btnPrimary}>
          {loading ? "Adding..." : "Add Zone"}
        </button>
      </form>

      <h2>Zones</h2>
      {zones.length === 0 ? (
        <p>No zones yet. Add your first zone above.</p>
      ) : (
        <table className={s.table}>
          <thead>
            <tr><th>Name</th><th>Units</th></tr>
          </thead>
          <tbody>
            {zones.map((z) => (
              <tr key={z.id}><td>{z.name}</td><td>{z._count.units}</td></tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
