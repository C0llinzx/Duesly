"use client"

import { useState, useEffect, useRef } from "react"
import { Upload, Plus, Search, X, FileSpreadsheet, Home, MessageCircle, Pencil, Trash2 } from "lucide-react"
import { useToast } from "@/components/ToastProvider"
import s from "@/components/shared.module.css"
import m from "./members.module.css"
import d from "../mevolut.module.css"

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text
  const escaped = escapeRegex(query)
  const parts = text.split(new RegExp(`(${escaped})`, "gi"))
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <mark key={i} className={m.match}>{part}</mark>
      : part
  )
}

interface Group {
  id: string
  name: string
  _count?: { units: number }
}

interface Member {
  id: string
  label: string
  address: string | null
  residentName: string | null
  phone1: string | null
  phone2: string | null
  residentEmail: string | null
  occupancyType: string | null
  status: string
  groupId: string
  groupName: string
}

interface CsvRow {
  zone: string
  unit: string
  address?: string
  residentName?: string
  phone1?: string
  phone2?: string
  email?: string
  change: "new" | "updated" | "unchanged"
  diff?: Record<string, { from: string; to: string }>
}

interface CsvError {
  row: number
  message: string
}

interface CsvResult {
  inserted: number
  updated: number
}

interface EditForm {
  memberId: string
  groupId: string
  label: string
  address: string
  residentName: string
  phone1: string
  phone2: string
  residentEmail: string
  status: string
}

type ImportStep = "idle" | "upload" | "preview" | "result"

export default function MembersPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Data ──
  const [groups, setGroups] = useState<Group[]>([])
  const [allMembers, setAllMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [loaded, setLoaded] = useState(false)

  // ── Search / filter ──
  const [searchQuery, setSearchQuery] = useState("")
  const searchRef = useRef<HTMLInputElement>(null)
  const [groupFilter, setGroupFilter] = useState("")
  const [owingOnly, setOwingOnly] = useState(false)

  // ── Sort ──
  const [sortKey, setSortKey] = useState<string>("house")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  // ── Selection ──
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // ── Add choice popover ──
  const [showAddChoice, setShowAddChoice] = useState(false)

  // ── Import flow ──
  const [importStep, setImportStep] = useState<ImportStep>("idle")
  const [csvRows, setCsvRows] = useState<CsvRow[] | null>(null)
  const [csvErrors, setCsvErrors] = useState<CsvError[]>([])
  const [csvImporting, setCsvImporting] = useState(false)
  const [csvResult, setCsvResult] = useState<CsvResult | null>(null)
  const [csvFeedback, setCsvFeedback] = useState("")
  const [csvNewCount, setCsvNewCount] = useState(0)
  const [csvUpdatedCount, setCsvUpdatedCount] = useState(0)
  const [csvNote, setCsvNote] = useState<string | null>(null)
  const [csvRenameWarning, setCsvRenameWarning] = useState<string | null>(null)

  // ── Manual add ──
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState({
    groupId: "",
    label: "",
    address: "",
    residentName: "",
    phone1: "",
    phone2: "",
    residentEmail: "",
  })
  const [adding, setAdding] = useState(false)
  const [newGroupName, setNewGroupName] = useState("")
  const [creatingGroup, setCreatingGroup] = useState(false)

  // ── Edit ──
  const [editForm, setEditForm] = useState<EditForm | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)

  // ── Deactivate ──
  const [deactivateTarget, setDeactivateTarget] = useState<Member | null>(null)
  const [deactivating, setDeactivating] = useState(false)

  // ── Apply due ──
  const [showApplyDue, setShowApplyDue] = useState(false)
  const [applyDues, setApplyDues] = useState<{ id: string; title: string; amountKobo: number }[]>([])
  const [applyZones, setApplyZones] = useState<{ id: string; name: string; houseCount: number }[]>([])
  const [applyTotalHouses, setApplyTotalHouses] = useState(0)
  const [selectedDueId, setSelectedDueId] = useState("")
  const [applyScope, setApplyScope] = useState<"all" | "zone" | "custom">("all")
  const [applyZoneId, setApplyZoneId] = useState("")
  const [applying, setApplying] = useState(false)

  async function openApplyDue() {
    setSelectedDueId("")
    setApplyScope("all")
    setApplyZoneId("")
    setShowApplyDue(true)
    try {
      const res = await fetch("/api/dashboard/assign-due")
      if (res.ok) {
        const data = await res.json()
        setApplyDues(data.dues ?? [])
        setApplyZones(data.zones ?? [])
        setApplyTotalHouses(data.totalActiveHouses ?? 0)
        if (data.dues?.length > 0) setSelectedDueId(data.dues[0].id)
      }
    } catch {}
  }

  async function handleApplyDue() {
    if (!selectedDueId) return
    setApplying(true)
    try {
      let unitIds: string[] = []
      if (applyScope === "all") {
        unitIds = allMembers.filter((m) => m.status === "active").map((m) => m.id)
      } else if (applyScope === "zone") {
        unitIds = allMembers.filter((m) => m.groupId === applyZoneId && m.status === "active").map((m) => m.id)
      } else {
        unitIds = filteredMembers.filter((m) => selectedIds.has(m.id) && m.status === "active").map((m) => m.id)
      }

      const res = await fetch("/api/dashboard/assign-due", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectionId: selectedDueId, unitIds }),
      })

      if (res.ok) {
        setShowApplyDue(false)
        setSelectedIds(new Set())
        const due = applyDues.find((d) => d.id === selectedDueId)
        showFeedback("success", `${due?.title ?? "Due"} applied to ${unitIds.length} house${unitIds.length !== 1 ? "s" : ""}.`)
      } else {
        const data = await res.json()
        showFeedback("error", data.error ?? "Failed to apply due")
      }
    } catch {
      showFeedback("error", "Something went wrong")
    } finally {
      setApplying(false)
    }
  }

  // ── Feedback via global toast ──
  const { success: toastSuccess, error: toastError } = useToast()

  // ── Payment status (who to chase) ──
  const [paidUnits, setPaidUnits] = useState<Set<string>>(new Set())
  const [activeCollection, setActiveCollection] = useState<string | null>(null)

  // ── Multi-due support ──
  const [allDues, setAllDues] = useState<{ id: string; title: string; amountKobo: number }[]>([])
  const [selectedDueFilter, setSelectedDueFilter] = useState("")
  const [duePayments, setDuePayments] = useState<Map<string, Set<string>>>(new Map()) // collectionId → paid unitIds

  // ── Load data ──

  useEffect(() => {
    let cancelled = false
    const ctrl = new AbortController()

    Promise.all([
      fetch("/api/dashboard/zones", { signal: ctrl.signal }).then(async (zonesRes) => {
        if (zonesRes.ok) {
          const data = await zonesRes.json()
          if (!cancelled) setGroups(data.zones ?? [])
        }
      }),
      fetch("/api/dashboard/units", { signal: ctrl.signal }).then(async (unitsRes) => {
        if (unitsRes.ok) {
          const data = await unitsRes.json()
          if (!cancelled) {
            const zones: { id: string; name: string; units: Member[] }[] = data.zones ?? []
            const flat: Member[] = []
            for (const z of zones) {
              for (const u of z.units) {
                flat.push({ ...u, groupId: z.id, groupName: z.name })
              }
            }
            setAllMembers(flat)
          }
        }
      }),
      fetch("/api/dashboard/overview", { signal: ctrl.signal }).then(async (overviewRes) => {
        if (overviewRes.ok) {
          const data = await overviewRes.json()
          if (!cancelled) {
            const paid = new Set<string>()
            for (const z of data.zones ?? []) {
              for (const u of z.units ?? []) {
                if (u.paid) paid.add(u.id)
              }
            }
            setPaidUnits(paid)
            if (data.collection) setActiveCollection(data.collection.title)
          }
        }
      }),
      fetch("/api/dashboard/collections", { signal: ctrl.signal }).then(async (collectionsRes) => {
        if (collectionsRes.ok) {
          const data = await collectionsRes.json()
          if (!cancelled) {
            const dues = data.collections ?? []
            setAllDues(dues.map((c: any) => ({ id: c.id, title: c.title, amountKobo: c.amountKobo })))
            const pmap = new Map<string, Set<string>>()
            for (const c of dues) {
              try {
                const pres = await fetch(`/api/dashboard/collections/${c.id}`, { signal: ctrl.signal })
                if (pres.ok) {
                  const pdata = await pres.json()
                  const paidSet = new Set<string>()
                  for (const u of pdata.units ?? []) {
                    if (u.paid) paidSet.add(u.id)
                  }
                  pmap.set(c.id, paidSet)
                }
              } catch {}
            }
            setDuePayments(pmap)
          }
        }
      }),
    ])
      .catch(() => {})
      .finally(() => { if (!cancelled) { setLoading(false); setLoaded(true) } })

    return () => { cancelled = true; ctrl.abort() }
  }, [])

  async function reloadData() {
    try {
      const [zonesRes, unitsRes] = await Promise.all([
        fetch("/api/dashboard/zones"),
        fetch("/api/dashboard/units"),
      ])

      if (zonesRes.ok) {
        const data = await zonesRes.json()
        setGroups(data.zones ?? [])
      }

      if (unitsRes.ok) {
        const data = await unitsRes.json()
        const zones: { id: string; name: string; units: Member[] }[] = data.zones ?? []
        const flat: Member[] = []
        for (const z of zones) {
          for (const u of z.units) {
            flat.push({ ...u, groupId: z.id, groupName: z.name })
          }
        }
        setAllMembers(flat)
      }
    } catch {
      // ignore
    }
  }

  function showFeedback(type: "success" | "error", message: string) {
    if (type === "success") toastSuccess(message)
    else toastError(message)
  }

  // ── Filtered + sorted members ──

  function toggleSort(key: string) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else { setSortKey(key); setSortDir("asc") }
  }

  const filteredMembers = allMembers
    .filter((m) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (!m.label.toLowerCase().includes(q) && !(m.residentName ?? "").toLowerCase().includes(q) && !(m.phone1 ?? "").toLowerCase().includes(q) && !(m.address ?? "").toLowerCase().includes(q) && !(m.residentEmail ?? "").toLowerCase().includes(q)) return false
      }
      if (groupFilter && m.groupId !== groupFilter) return false
      if (owingOnly && selectedDueFilter) {
        const paidSet = duePayments.get(selectedDueFilter)
        if (paidSet?.has(m.id)) return false
      } else if (owingOnly && paidUnits.has(m.id)) return false
      return true
    })
    .sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1
      if (sortKey === "house") return a.label.localeCompare(b.label) * dir
      if (sortKey === "name") return (a.residentName ?? "").localeCompare(b.residentName ?? "") * dir
      if (sortKey === "status") {
        const aPaid = paidUnits.has(a.id)
        const bPaid = paidUnits.has(b.id)
        return (aPaid === bPaid ? 0 : aPaid ? 1 : -1) * dir
      }
      return 0
    })

  const totalOwingAmount = activeCollection
    ? filteredMembers.filter((m) => !paidUnits.has(m.id)).length * 1500000 // ₦15,000 per house
    : 0

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedIds.size === filteredMembers.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(filteredMembers.map((m) => m.id)))
  }

  const hasGroups = groups.length > 0
  const isEmpty = allMembers.length === 0 && loaded

  // ── Bulk remind ──

  function handleBulkRemind() {
    const owingSelected = filteredMembers.filter((m) => selectedIds.has(m.id) && !paidUnits.has(m.id))
    if (owingSelected.length === 0) {
      showFeedback("error", "No owing houses selected.")
      return
    }
    toastSuccess(`Reminder sent to ${owingSelected.length} house${owingSelected.length !== 1 ? "s" : ""}.`)
    setSelectedIds(new Set())
  }

  // ── Import CSV ──

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvResult(null)
    setCsvFeedback("")

    const formData = new FormData()
    formData.append("file", file)

    fetch("/api/dashboard/csv-preview", {
      method: "POST",
      body: formData,
    })
      .then(async (res) => {
        if (res.ok) return res.json()
        const err = await res.json()
        throw new Error(err.error ?? "Preview failed")
      })
      .then((data) => {
        setCsvRows(data.rows)
        setCsvErrors(data.errors ?? [])
        setCsvNewCount(data.newCount ?? 0)
        setCsvUpdatedCount(data.updatedCount ?? 0)
        setCsvNote(data.note ?? null)
        setCsvRenameWarning(data.renameWarnings ?? null)
        setImportStep("preview")
      })
      .catch((err) => {
        setCsvFeedback(err.message)
      })
  }

  async function handleCsvImport() {
    const file = fileInputRef.current?.files?.[0]
    if (!file) return

    setCsvImporting(true)
    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch("/api/dashboard/csv-import", {
        method: "POST",
        body: formData,
      })

      if (res.ok) {
        const data = await res.json()
        setImportStep("idle")
        setCsvRows(null)
        setCsvErrors([])
        let msg = `${data.inserted} house${data.inserted !== 1 ? "s" : ""} imported${data.updated > 0 ? `, ${data.updated} updated` : ""}.`
        if (data.autoAssigned?.length > 0) {
          const parts = data.autoAssigned.map((a: { levyTitle: string; count: number }) => `${a.count} to ${a.levyTitle}`)
          msg += ` Auto-assigned: ${parts.join(", ")}.`
        }
        toastSuccess(msg)
        await reloadData()
      } else {
        const data = await res.json()
        setCsvFeedback(data.error ?? "Import failed")
      }
    } catch {
      setCsvFeedback("Something went wrong")
    } finally {
      setCsvImporting(false)
    }
  }

  function resetImport() {
    setImportStep("idle")
    setCsvRows(null)
    setCsvErrors([])
    setCsvResult(null)
    setCsvFeedback("")
    setCsvNewCount(0)
    setCsvUpdatedCount(0)
    setCsvNote(null)
    setCsvRenameWarning(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  // ── Add manually ──

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault()
    if (!addForm.label.trim()) return

    let targetGroupId = addForm.groupId

    // If user typed a new group name, create it first
    if (!targetGroupId && newGroupName.trim()) {
      setCreatingGroup(true)
      try {
        const res = await fetch("/api/dashboard/zones", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newGroupName.trim() }),
        })
        if (res.ok) {
          const data = await res.json()
          targetGroupId = data.id ?? data.zone?.id
          await reloadData()
        }
      } catch {
        // ignore
      } finally {
        setCreatingGroup(false)
      }
    }

    if (!targetGroupId) return

    setAdding(true)
    try {
      const res = await fetch("/api/dashboard/units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            zoneId: targetGroupId,
            label: addForm.label.trim(),
            address: addForm.address.trim() || undefined,
            residentName: addForm.residentName.trim() || undefined,
            phone1: addForm.phone1.trim() || undefined,
            phone2: addForm.phone2.trim() || undefined,
            residentEmail: addForm.residentEmail.trim() || undefined,
            occupancyType: "owner",
          }),
      })

      if (res.ok) {
        const data = await res.json()
        setAddForm({ groupId: "", label: "", address: "", residentName: "", phone1: "", phone2: "", residentEmail: "" })
        setNewGroupName("")
        setShowAddForm(false)
        setShowAddChoice(false)
        let msg = `${addForm.label} added successfully.`
        if (data.autoAssigned?.length > 0) {
          const parts = data.autoAssigned.map((a: { levyTitle: string; count: number }) => `added to ${a.levyTitle}`)
          msg += ` Auto-assigned: ${parts.join(", ")}.`
        }
        showFeedback("success", msg)
        await reloadData()
      } else {
        const data = await res.json()
        showFeedback("error", data.error ?? "Failed to add house")
      }
    } catch {
      showFeedback("error", "Something went wrong")
    } finally {
      setAdding(false)
    }
  }

  // ── Edit ──

  const [drawerDues, setDrawerDues] = useState<any[] | null>(null)

  function startEdit(member: Member) {
    setEditForm({
      memberId: member.id,
      groupId: member.groupId,
      label: member.label,
      address: member.address ?? "",
      residentName: member.residentName ?? "",
      phone1: member.phone1 ?? "",
      phone2: member.phone2 ?? "",
      residentEmail: member.residentEmail ?? "",
      status: member.status,
    })
    setDrawerDues(null)
    fetch(`/api/dashboard/units/${member.id}/dues`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) {
          setDrawerDues(data.dues ?? [])
          setEditForm((prev) => prev ? {
            ...prev,
            address: data.unit.address ?? prev.address,
            residentName: data.unit.residentName ?? prev.residentName,
            phone1: data.unit.phone1 ?? prev.phone1,
            phone2: data.unit.phone2 ?? prev.phone2,
            residentEmail: data.unit.residentEmail ?? prev.residentEmail,
          } : prev)
        }
      })
      .catch(() => {})
  }

  function updateEdit(field: string, value: string) {
    if (!editForm) return
    setEditForm({ ...editForm, [field]: value })
  }

  async function saveEdit() {
    if (!editForm) return
    setSavingEdit(true)
    try {
      const res = await fetch(`/api/dashboard/units/${editForm.memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          residentName: editForm.residentName || undefined,
          phone1: editForm.phone1 || undefined,
          phone2: editForm.phone2 || undefined,
          residentEmail: editForm.residentEmail || undefined,
          status: editForm.status,
          address: editForm.address || undefined,
        }),
      })

      if (res.ok) {
        setEditForm(null)
        setDrawerDues(null)
        showFeedback("success", `${editForm.label} updated.`)
        await reloadData()
      } else {
        const data = await res.json()
        showFeedback("error", data.error ?? "Failed to update")
      }
    } catch {
      showFeedback("error", "Something went wrong")
    } finally {
      setSavingEdit(false)
    }
  }

  // ── Deactivate ──

  async function confirmDeactivate() {
    if (!deactivateTarget) return
    setDeactivating(true)
    try {
      const res = await fetch(`/api/dashboard/units/${deactivateTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "inactive" }),
      })

      if (res.ok) {
        setDeactivateTarget(null)
        showFeedback("success", `${deactivateTarget.label} deactivated.`)
        await reloadData()
      } else {
        showFeedback("error", "Failed to deactivate")
      }
    } catch {
      showFeedback("error", "Something went wrong")
    } finally {
      setDeactivating(false)
    }
  }

  // ── Render helpers ──

  function renderDiffCell(diff: { from: string; to: string } | undefined, current: string) {
    if (!diff) return <>{current}</>
    return (
      <span title={`${diff.from} → ${diff.to}`}>
        <span className={m.previewDiffOld}>{diff.from}</span>
        <span className={m.previewDiffArrow}>→</span>
        <span className={m.previewDiffNew}>{diff.to}</span>
      </span>
    )
  }

  // ── Render ──

  if (!loaded) return null

  return (
    <div className={d.mainArea}>
      {/* ─── Top bar ─── */}
      <header className={d.mainHeader}>
        <div>
          <h1 className={d.mainTitle}>Houses &amp; Residents</h1>
          <p className={d.mainSubtitle}>Manage houses, zones, and residents.</p>
        </div>
        <div className={m.topBarActions}>
          {!isEmpty && (
            <>
              <button
                className={s.btnPrimary}
                onClick={() => setShowAddChoice((p) => !p)}
              >
                <span>Add houses</span>
              </button>
              <button
                className={s.btnSecondary}
                onClick={openApplyDue}
              >
                Apply due
              </button>
            </>
          )}

          {showAddChoice && (
            <>
              <div
                style={{
                  position: "fixed",
                  inset: 0,
                  zIndex: 25,
                }}
                onClick={() => setShowAddChoice(false)}
              />
              <div className={m.choicePopover}>
                <button
                  className={m.choiceOption}
                  onClick={() => {
                    setShowAddChoice(false)
                    setImportStep("upload")
                  }}
                >
                  <Upload size={20} className={m.choiceOptionIcon} />
                  <span className={m.choiceOptionLabel}>
                    <span className={m.choiceOptionTitle}>Import from spreadsheet</span>
                    <span className={m.choiceOptionDesc}>Import household</span>
                  </span>
                </button>
                <button
                  className={m.choiceOption}
                  onClick={() => {
                    setShowAddChoice(false)
                    setShowAddForm(true)
                  }}
                >
                  <Plus size={20} className={m.choiceOptionIcon} />
                  <span className={m.choiceOptionLabel}>
                    <span className={m.choiceOptionTitle}>Add manually</span>
                    <span className={m.choiceOptionDesc}>Add one house at a time</span>
                  </span>
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {/* ─── Empty state (no members) — NO other content shown ─── */}
      {isEmpty && (
        <div className={d.emptyCenter}>
          <div className={d.emptyLinear}>
            <div className={d.emptyLinearIcon}><Home size={20} /></div>
            <h2 className={d.emptyLinearTitle}>Houses</h2>
            <p className={d.emptyLinearText}>
              Houses are the units in your estate that dues are applied to. There are no houses yet. Import your estate list from a spreadsheet or add houses one by one to get started.
            </p>
            <div className={d.emptyLinearActions}>
              <button className={d.primaryBtn} onClick={() => setImportStep("upload")}>
                Import from spreadsheet
              </button>
              <button className={d.secondaryLink} onClick={() => setShowAddForm(true)}>
                Add manually &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Members table (members exist) — NO empty state shown ─── */}
      {!isEmpty && (
        <>
          <div className={m.filterStrip}>
            <div className={m.searchWrapper}>
              <Search size={16} className={m.searchIcon} />
              <input
                ref={searchRef}
                className={m.searchInput}
                placeholder="Search by name, house, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setSearchQuery("")
                    searchRef.current?.focus()
                  }
                }}
              />
              {searchQuery && (
                <button
                  className={m.searchClear}
                  onClick={() => { setSearchQuery(""); searchRef.current?.focus() }}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            {allDues.length > 0 && (
              <select
                className={m.groupFilter}
                value={selectedDueFilter}
                onChange={(e) => setSelectedDueFilter(e.target.value)}
              >
                <option value="">All dues</option>
                {allDues.map((d) => (
                  <option key={d.id} value={d.id}>{d.title}</option>
                ))}
              </select>
            )}
            {hasGroups && (
              <select
                className={m.groupFilter}
                value={groupFilter}
                onChange={(e) => { setGroupFilter(e.target.value); setSelectedIds(new Set()) }}
              >
                <option value="">All zones</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            )}
            {selectedDueFilter && (
              <button
                className={`${m.owingToggle} ${owingOnly ? m.owingToggleActive : ""}`}
                onClick={() => { setOwingOnly((p) => !p); setSelectedIds(new Set()) }}
              >
                Owing only
              </button>
            )}
          </div>

          {/* Summary bar */}
          <div className={m.summaryBar}>
            <span className={m.summaryText}>
              {searchQuery
                ? <>{filteredMembers.length} of {allMembers.length} house{allMembers.length !== 1 ? "s" : ""} matching &lsquo;{searchQuery}&rsquo;</>
                : <>{filteredMembers.length} of {allMembers.length} house{allMembers.length !== 1 ? "s" : ""} shown</>
              }
              {selectedDueFilter ? (
                (() => {
                  const paidSet = duePayments.get(selectedDueFilter)
                  const owing = filteredMembers.filter((m) => !(paidSet?.has(m.id))).length
                  const due = allDues.find((d) => d.id === selectedDueFilter)
                  const total = owing * (due?.amountKobo ?? 0)
                  return <> · <strong>{owing}</strong> owing{total > 0 ? ` · ₦${(total / 100).toLocaleString()}` : ""} outstanding</>
                })()
              ) : activeCollection ? (
                <> · <strong>{filteredMembers.filter((m) => !paidUnits.has(m.id)).length}</strong> owing</>
              ) : null}
            </span>
            {selectedIds.size > 0 && (
              <span className={m.summaryActions}>
                <button className={m.summaryBtn} onClick={handleBulkRemind}>
                  Remind selected ({selectedIds.size})
                </button>
                <button className={m.summaryBtnSecondary} onClick={() => setSelectedIds(new Set())}>
                  Clear
                </button>
              </span>
            )}
          </div>

          {/* Single sticky column header row */}
          <div className={m.memberTableHead}>
            <span className={m.colCheck}>
              <input type="checkbox" className={m.rowCheckbox} onChange={toggleSelectAll} checked={selectedIds.size === filteredMembers.length && filteredMembers.length > 0} />
            </span>
            <span className={m.colHeaderIdSortable} onClick={() => toggleSort("house")}>
              House {sortKey === "house" ? (sortDir === "asc" ? "↑" : "↓") : ""}
            </span>
            <span className={m.colHeaderAddress}>Address</span>
            <span className={m.colHeaderNameSortable} onClick={() => toggleSort("name")}>
              Resident {sortKey === "name" ? (sortDir === "asc" ? "↑" : "↓") : ""}
            </span>
            <span className={m.colHeaderPhone}>Phone</span>
            <span className={m.colHeaderEmail}>Email</span>
            {selectedDueFilter || activeCollection ? (
              <span className={m.colHeaderStatusSmSortable} onClick={() => selectedDueFilter && toggleSort("status")}>
                Status {selectedDueFilter && sortKey === "status" ? (sortDir === "asc" ? "↑" : "↓") : ""}
              </span>
            ) : null}
            <span style={{ flex: "0 0 84px" }} />
          </div>

          {/* Zone-grouped table */}
          <div className={m.zoneSections}>
            {filteredMembers.length === 0 ? (
              <div className={m.noResults}>
                <span>No houses match &lsquo;<span className={m.noResultsQuery}>{searchQuery}</span>&rsquo;</span>
                <button className={m.noResultsClear} onClick={() => { setSearchQuery(""); searchRef.current?.focus() }}>
                  Clear search
                </button>
              </div>
            ) : (
              // Group by zone, drop empty groups
              Object.entries(
                filteredMembers.reduce<Record<string, Member[]>>((acc, m) => {
                  ;(acc[m.groupName] ??= []).push(m)
                  return acc
                }, {})
              ).filter(([, zoneMembers]) => zoneMembers.length > 0).map(([zoneName, zoneMembers]) => (
                <section key={zoneName} className={m.zoneSection}>
                  <header className={m.zoneHeader}>
                    <h3 className={m.zoneTitle}>{zoneName}</h3>
                    <span className={m.zoneCount}>{zoneMembers.length} house{zoneMembers.length !== 1 ? "s" : ""}</span>
                  </header>

                  <div className={m.memberTable}>
                    <div className={m.memberTableBody}>
                      {zoneMembers.map((member) => {
                        const isPaid = paidUnits.has(member.id)
                        const phone = member.phone1
                        const waNum = phone?.replace(/[^0-9+]/g, "") ?? ""
                        return (
                          <div
                            key={member.id}
                            className={`${m.memberTableRow} ${selectedIds.has(member.id) ? m.memberTableRowSelected : ""}`}
                            style={{ opacity: member.status === "inactive" ? 0.45 : 1 }}
                            title={`${member.label} — ${member.residentName ?? "No resident"}`}
                            onClick={(e) => { if (!(e.target as HTMLElement).closest('button, a, input, .cellActions')) startEdit(member) }}
                          >
                            <span className={m.colCheck}>
                              <input type="checkbox" className={m.rowCheckbox} checked={selectedIds.has(member.id)} onChange={() => toggleSelect(member.id)} />
                            </span>
                            <span className={m.cellId}>{highlightText(member.label, searchQuery)}</span>
                            <span className={m.cellAddress} title={member.address ?? ""}>{member.address ? highlightText(member.address, searchQuery) : "—"}</span>
                            <span className={m.cellName} title={member.residentName ?? ""}>{member.residentName ? highlightText(member.residentName, searchQuery) : "—"}</span>
                            <span className={m.cellPhone}>
                              {phone ? (
                                <span className={m.phoneGroup}>
                                  <span className={m.phoneNumber}>{highlightText(phone, searchQuery)}</span>
                                  <span className={m.phoneActions}>
                                    <a href={`https://wa.me/${waNum}`} className={m.contactBtn} title="WhatsApp" target="_blank" rel="noopener">
                                      <MessageCircle size={13} strokeWidth={1.75} />
                                    </a>
                                  </span>
                                </span>
                              ) : <span className={m.missingVal}>—</span>}
                            </span>
                            <span className={m.cellEmail} title={member.residentEmail ?? ""}>{member.residentEmail ? highlightText(member.residentEmail, searchQuery) : "—"}</span>
                            {selectedDueFilter ? (
                              <span className={m.cellStatusSm}>
                                <span className={duePayments.get(selectedDueFilter)?.has(member.id) ? m.statusPaid : m.statusOwing}>
                                  {duePayments.get(selectedDueFilter)?.has(member.id) ? "Paid" : "Owing"}
                                </span>
                              </span>
                            ) : activeCollection ? (
                              <span className={m.cellStatusSm}>
                                {(() => {
                                  const total = allDues.length || 1
                                  const paid = allDues.filter((d) => duePayments.get(d.id)?.has(member.id)).length
                                  const label = paid > 0 ? `${paid} of ${total} paid` : "Owing"
                                  return <span className={paid > 0 ? m.statusPaid : m.statusOwing}>{label}</span>
                                })()}
                              </span>
                            ) : null}
                            <span className={m.cellActions}>
                              <button className={m.actionBtn} onClick={() => startEdit(member)} title="Edit">
                                <Pencil size={14} strokeWidth={1.75} />
                              </button>
                              {member.status === "active" && (
                                <button className={`${m.actionBtn} ${m.actionBtnDanger}`} onClick={() => setDeactivateTarget(member)} title="Deactivate">
                                  <Trash2 size={14} strokeWidth={1.75} />
                                </button>
                              )}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </section>
              ))
            )}
          </div>
        </>
      )}

      {/* ─── Edit drawer ─── */}
      {editForm && (
        <>
          <div className={m.drawerBackdrop} onClick={() => { setEditForm(null); setDrawerDues(null) }} />
          <div className={m.drawer}>
            <div className={m.drawerHeader}>
              <h2 className={m.drawerTitle}>{editForm.label}</h2>
              <span className={m.drawerZone}>{groups.find((g) => g.id === editForm.groupId)?.name ?? editForm.groupId}</span>
              <button className={m.drawerClose} onClick={() => { setEditForm(null); setDrawerDues(null) }} aria-label="Close">
                <X size={18} strokeWidth={1.75} />
              </button>
            </div>
            <div className={m.drawerBody}>
              {/* ── House Details ── */}
              <section className={m.drawerSection}>
                <h3 className={m.drawerSectionTitle}>House details</h3>
                <div className={m.drawerField}>
                  <label className={m.drawerLabel}>Address</label>
                  <input className={m.drawerInput} value={editForm.address} onChange={(e) => updateEdit("address", e.target.value)} placeholder="e.g. 15, Peace Avenue" />
                </div>
                <div className={m.drawerField}>
                  <label className={m.drawerLabel}>Resident</label>
                  <input className={m.drawerInput} value={editForm.residentName} onChange={(e) => updateEdit("residentName", e.target.value)} placeholder="Full name" />
                </div>
                <div className={m.drawerField}>
                  <label className={m.drawerLabel}>Phone</label>
                  <input className={m.drawerInput} value={editForm.phone1} onChange={(e) => updateEdit("phone1", e.target.value)} placeholder="Phone" />
                </div>
                {editForm.phone2 ? (
                  <div className={m.drawerField}>
                    <label className={m.drawerLabel}>Phone 2</label>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input className={m.drawerInput} style={{ flex: 1 }} value={editForm.phone2} onChange={(e) => updateEdit("phone2", e.target.value)} placeholder="Alt" />
                      <button type="button" onClick={() => updateEdit("phone2", "")} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: 4 }} title="Remove">
                        <X size={16} strokeWidth={1.75} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => updateEdit("phone2", " ")} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontFamily: "inherit", fontSize: "var(--font-size-text-xs)", padding: "4px 0", marginTop: 16 }}>
                    <Plus size={14} strokeWidth={1.75} />
                    Add second phone
                  </button>
                )}
                <div className={m.drawerField}>
                  <label className={m.drawerLabel}>Email</label>
                  <input className={m.drawerInput} value={editForm.residentEmail} onChange={(e) => updateEdit("residentEmail", e.target.value)} placeholder="Email" type="email" />
                </div>
                <div className={m.drawerField}>
                  <label className={m.drawerLabel}>Status</label>
                  <select className={m.drawerSelect} value={editForm.status} onChange={(e) => updateEdit("status", e.target.value)}>
                    <option value="active">Active</option>
                    <option value="exempt">Exempt</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </section>

              {/* ── Dues ── */}
              <section className={m.drawerSection}>
                <h3 className={m.drawerSectionTitle}>Dues</h3>
                {drawerDues === null ? (
                  <p className={m.drawerLoading}>Loading...</p>
                ) : drawerDues.length === 0 ? (
                  <p className={m.drawerEmpty}>No active dues yet.</p>
                ) : (
                  <div className={m.drawerDuesList}>
                    {drawerDues.map((due: any) => (
                      <div key={due.collectionId} className={`${m.drawerDueRow} ${due.isExcluded ? m.drawerDueExcluded : ""}`}>
                        <div className={m.drawerDueTop}>
                          <div className={m.drawerDueInfo}>
                            <span className={m.drawerDueTitle}>{due.title}</span>
                            <span className={m.drawerDueAmount}>
                              {due.isException ? (
                                <><span className={m.drawerAmountStrike}>₦{(due.defaultAmountKobo / 100).toLocaleString()}</span> ₦{(due.amountKobo / 100).toLocaleString()}</>
                              ) : `₦${(due.amountKobo / 100).toLocaleString()}`}
                            </span>
                          </div>
                          <span className={`${m.drawerDueStatus} ${due.status === "paid" ? m.drawerDuePaid : due.status === "excluded" ? m.drawerDueExcludedBadge : m.drawerDueOwing}`}>
                            {due.status === "paid" ? `Paid${due.method === "manual" ? " · offline" : ""}` : due.status === "excluded" ? "Excluded" : "Owing"}
                          </span>
                        </div>

                        {due.status === "owing" && (
                          <div className={m.drawerDueActions}>
                            <button className={m.drawerDueAction} onClick={async () => {
                              const res = await fetch(`/api/dashboard/units/${editForm.memberId}/dues`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ action: "mark-paid", collectionId: due.collectionId }),
                              })
                              if (res.ok) {
                                const data = await (await fetch(`/api/dashboard/units/${editForm.memberId}/dues`)).json()
                                setDrawerDues(data.dues ?? [])
                                showFeedback("success", `${due.title} marked as paid.`)
                              }
                            }}>Mark paid</button>
                            {editForm.phone1 && (
                              <a href={`https://wa.me/${editForm.phone1.replace(/[^0-9+]/g, "")}?text=Pay ${encodeURIComponent(due.title)}`} className={m.drawerDueAction} target="_blank" rel="noopener">Share</a>
                            )}
                            <button className={m.drawerDueActionSecondary} onClick={() => {
                              const link = `${window.location.origin}/pay/${due.slug}?unit=${editForm.label}&zone=${editForm.groupId}`
                              navigator.clipboard.writeText(link)
                              showFeedback("success", "Payment link copied.")
                            }}>Copy link</button>
                          </div>
                        )}

                        {due.status === "paid" && due.method && (
                          <div className={m.drawerDueActions}>
                            <span className={m.drawerDueMethod}>via {due.method === "online" ? "Paystack" : "Manual entry"}</span>
                          </div>
                        )}

                        {!due.isExcluded && due.status !== "excluded" && (
                          <button className={m.drawerExcludeBtn} onClick={async () => {
                            await fetch(`/api/dashboard/units/${editForm.memberId}/dues`, {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ action: "exclude", collectionId: due.collectionId }),
                            })
                            const data = await (await fetch(`/api/dashboard/units/${editForm.memberId}/dues`)).json()
                            setDrawerDues(data.dues ?? [])
                          }}>Exclude from this due</button>
                        )}
                        {due.isExcluded && (
                          <button className={m.drawerReassignBtn} onClick={async () => {
                            await fetch(`/api/dashboard/units/${editForm.memberId}/dues`, {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ action: "assign", collectionId: due.collectionId }),
                            })
                            const data = await (await fetch(`/api/dashboard/units/${editForm.memberId}/dues`)).json()
                            setDrawerDues(data.dues ?? [])
                          }}>Re-assign to this due</button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {drawerDues && allDues.length > drawerDues.length && (
                  <div className={m.drawerAssignSection}>
                    <button className={s.btnSecondary} onClick={async () => {
                      const unassigned = allDues.filter((ad) => !drawerDues.some((dd: any) => dd.collectionId === ad.id))
                      // Simple assign: pick first unassigned (improved UX could use a dropdown)
                      if (unassigned.length === 0) return
                      const pick = unassigned[0]
                      await fetch(`/api/dashboard/units/${editForm.memberId}/dues`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "assign", collectionId: pick.id }),
                      })
                      const data = await (await fetch(`/api/dashboard/units/${editForm.memberId}/dues`)).json()
                      setDrawerDues(data.dues ?? [])
                      showFeedback("success", `${pick.title} assigned.`)
                    }}>Assign a due</button>
                  </div>
                )}
              </section>
            </div>
            <div className={m.drawerFooter}>
              <button onClick={() => { setEditForm(null); setDrawerDues(null) }} className={s.btnSecondary}>Cancel</button>
              <button onClick={saveEdit} disabled={savingEdit} className={s.btnPrimary}>
                {savingEdit ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ─── Import flow modal ─── */}
      {importStep !== "idle" && (
        <div className={m.modal} onClick={() => {}}>
          <div className={m.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={m.modalHeader}>
              <h2 className={m.modalTitle}>
                {importStep === "upload" && "Import from spreadsheet"}
                {importStep === "preview" && "Preview & confirm"}
                {importStep === "result" && "Import complete"}
              </h2>
              <button className={m.panelClose} onClick={resetImport}>
              </button>
            </div>

            <div className={m.modalBody}>
              {/* File input always mounted while modal is open */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.tsv,.txt"
                onChange={handleFileSelect}
                style={{ display: "none" }}
              />

              {importStep === "upload" && (
                <>
                  <div
                    className={m.uploadArea}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FileSpreadsheet size={48} className={m.uploadIcon} />
                    <span className={m.uploadLabel}>Choose a spreadsheet to import</span>
                    <span className={m.uploadHint}>
                      Expected columns: Zone, House, Address, Name, Phone1, Phone2, Email
                    </span>
                    <a href="/api/dashboard/csv-template" className={m.uploadHint} style={{ cursor: "pointer", textDecoration: "underline" }} download>
                      Download template
                    </a>
                  </div>
                  {csvFeedback && (
                    <div className={m.feedbackError} style={{ marginTop: 12 }}>
                      {csvFeedback}
                    </div>
                  )}
                </>
              )}

              {importStep === "preview" && csvRows && (
                <>
                  {csvErrors.length > 0 && (
                    <div className={m.feedbackError}>
                      <strong>{csvErrors.length} row{csvErrors.length !== 1 ? "s" : ""} with errors</strong>
                      <ul style={{ margin: "4px 0 0", paddingLeft: 16 }}>
                        {csvErrors.map((e, i) => (
                          <li key={i}>Row {e.row}: {e.message}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className={m.previewSummary}>
                    {csvNewCount > 0 && <span><strong>{csvNewCount}</strong> new</span>}
                    {csvUpdatedCount > 0 && <span><strong>{csvUpdatedCount}</strong> updated</span>}
                    {(csvRows.length - csvNewCount - csvUpdatedCount) > 0 && <span className={m.previewUnchanged}><strong>{csvRows.length - csvNewCount - csvUpdatedCount}</strong> unchanged</span>}
                  </div>

                  {csvNote && (
                    <div className={m.previewNote}>{csvNote}</div>
                  )}

                  {csvRenameWarning && (
                    <div className={m.previewRenameWarning}>
                      <span className={m.previewRenameIcon}>ⓘ</span>
                      {csvRenameWarning}
                    </div>
                  )}

                  <div style={{ overflowX: "auto" }}>
                    <table className={m.previewTable}>
                      <thead>
                        <tr>
                          <th />
                          <th>Zone</th>
                          <th>House</th>
                          <th>Address</th>
                          <th>Name</th>
                          <th>Phone 1</th>
                          <th>Phone 2</th>
                          <th>Email</th>
                        </tr>
                      </thead>
                      <tbody>
                        {csvRows.map((row, i) => (
                          <tr key={i} className={row.change === "unchanged" ? m.previewRowDim : ""}>
                            <td>
                              <span className={row.change === "new" ? m.previewTagNew : row.change === "updated" ? m.previewTagUpdated : m.previewTagUnchanged}>
                                {row.change === "new" ? "New" : row.change === "updated" ? "Update" : "—"}
                              </span>
                            </td>
                            <td>{row.zone}</td>
                            <td>{row.unit}</td>
                            <td>
                              {renderDiffCell(row.diff?.address, row.address ?? "—")}
                            </td>
                            <td>
                              {renderDiffCell(row.diff?.name, row.residentName ?? "—")}
                            </td>
                            <td>
                              {renderDiffCell(row.diff?.phone1, row.phone1 ?? "—")}
                            </td>
                            <td>
                              {renderDiffCell(row.diff?.phone2, row.phone2 ?? "—")}
                            </td>
                            <td>
                              {renderDiffCell(row.diff?.email, row.email ?? "—")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {csvFeedback && (
                    <div className={m.feedbackError} style={{ marginTop: 12 }}>
                      {csvFeedback}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className={m.modalFooter}>
              {importStep === "upload" && (
                <button className={s.btnSecondary} onClick={resetImport}>
                  Cancel
                </button>
              )}
              {importStep === "preview" && (
                <>
                  <button className={s.btnSecondary} onClick={resetImport}>
                    Cancel
                  </button>
                  <button
                    className={s.btnPrimary}
                    onClick={handleCsvImport}
                    disabled={csvImporting || csvNewCount + csvUpdatedCount === 0}
                  >
                    {csvImporting
                      ? "Importing..."
                      : csvUpdatedCount > 0
                        ? `Add ${csvNewCount} · Update ${csvUpdatedCount}`
                        : `Add ${csvNewCount} house${csvNewCount !== 1 ? "s" : ""}`
                    }
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Add member modal ─── */}
      {showAddForm && (
        <div className={m.modal} onClick={() => setShowAddForm(false)}>
          <div className={m.modalCardAdd} onClick={(e) => e.stopPropagation()}>
            <div className={m.modalHeader}>
              <h2 className={m.modalTitle}>Add a house</h2>
              <button className={m.panelClose} onClick={() => setShowAddForm(false)}>
              </button>
            </div>
            <form className={m.modalBody} onSubmit={handleAddMember}>
              {hasGroups && (
                <div className={m.formRow}>
                <label className={m.formLabel}>Zone</label>
                  <select
                    className={m.formSelect}
                    value={addForm.groupId}
                    onChange={(e) => setAddForm({ ...addForm, groupId: e.target.value })}
                  >
                    <option value="">Select a zone</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {!hasGroups && (
                <div className={m.formRow}>
                  <label className={m.formLabel}>Zone name</label>
                  <input
                    className={m.formInput}
                    placeholder="e.g. Block A"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                  />
                  <span style={{ fontSize: "var(--font-size-text-xs)", color: "var(--text-secondary)", marginTop: 2 }}>
                    Create a zone to organise your estate
                  </span>
                </div>
              )}
              <div className={m.formRow}>
                <label className={m.formLabel}>House / identifier</label>
                <input
                  className={m.formInput}
                  placeholder="e.g. 12A or Flat 3"
                  value={addForm.label}
                  onChange={(e) => setAddForm({ ...addForm, label: e.target.value })}
                />
              </div>
              <div className={m.formRow}>
                <label className={m.formLabel}>Address</label>
                <input
                  className={m.formInput}
                  placeholder="e.g. 12 Gemade Crescent"
                  value={addForm.address}
                  onChange={(e) => setAddForm({ ...addForm, address: e.target.value })}
                />
              </div>
              <div className={m.formRow}>
                <label className={m.formLabel}>Name</label>
                <input
                  className={m.formInput}
                  placeholder="Full name"
                  value={addForm.residentName}
                  onChange={(e) => setAddForm({ ...addForm, residentName: e.target.value })}
                />
              </div>
              <div className={m.formRow}>
                <label className={m.formLabel}>Phone</label>
                <input
                  className={m.formInput}
                  placeholder="Phone number"
                  value={addForm.phone1}
                  onChange={(e) => setAddForm({ ...addForm, phone1: e.target.value })}
                />
              </div>
              <div className={m.formRow}>
                <label className={m.formLabel}>Email</label>
                <input
                  className={m.formInput}
                  placeholder="Email address"
                  type="email"
                  value={addForm.residentEmail}
                  onChange={(e) => setAddForm({ ...addForm, residentEmail: e.target.value })}
                />
              </div>
              <div className={m.formActions} style={{ marginTop: 16 }}>
                <button type="submit" disabled={adding || creatingGroup} className={s.btnPrimary}>
                  {adding ? "Adding..." : "Add house"}
                </button>
                <button type="button" className={s.btnSecondary} onClick={() => setShowAddForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Deactivate confirmation ─── */}
      {deactivateTarget && (
        <div className={m.confirmOverlay} onClick={() => setDeactivateTarget(null)}>
          <div className={m.confirmCard} onClick={(e) => e.stopPropagation()}>
            <h3 className={m.confirmTitle}>Deactivate {deactivateTarget.label}?</h3>
            <p className={m.confirmText}>
              This house won&apos;t appear in active counts or future dues. You can reactivate it anytime.
            </p>
            <div className={m.confirmActions}>
              <button className={s.btnSecondary} onClick={() => setDeactivateTarget(null)}>
                Cancel
              </button>
              <button
                className={s.btnPrimary}
                style={{ background: "#dc2626", color: "#fff" }}
                onClick={confirmDeactivate}
                disabled={deactivating}
              >
                {deactivating ? "Deactivating..." : "Deactivate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Apply Due modal ─── */}
      {showApplyDue && (
        <div className={m.modal} onClick={() => setShowApplyDue(false)}>
          <div className={m.modalCardAdd} onClick={(e) => e.stopPropagation()}>
            <div className={m.modalHeader}>
              <h2 className={m.modalTitle}>Apply a due</h2>
              <button className={m.panelClose} onClick={() => setShowApplyDue(false)}>
                <X size={18} strokeWidth={1.75} />
              </button>
            </div>
            <div className={m.modalBody}>
              {applyDues.length === 0 ? (
                <p style={{ fontSize: "var(--font-size-text-sm)", color: "var(--text-secondary)", textAlign: "center", padding: "24px 0" }}>
                  No active dues. Create one first on the Dues page.
                </p>
              ) : (
                <>
                  <div className={m.formRow}>
                    <label className={m.formLabel}>Select a due</label>
                    <select className={m.formSelect} value={selectedDueId} onChange={(e) => setSelectedDueId(e.target.value)}>
                      {applyDues.map((d) => (
                        <option key={d.id} value={d.id}>{d.title} — ₦{(d.amountKobo / 100).toLocaleString()}</option>
                      ))}
                    </select>
                  </div>

                  <div className={m.formRow}>
                    <label className={m.formLabel}>Apply to</label>
                    <div className={m.applyScopeRow}>
                      <button className={`${m.applyScopeBtn} ${applyScope === "all" ? m.applyScopeBtnActive : ""}`} onClick={() => setApplyScope("all")}>All zones</button>
                      <button className={`${m.applyScopeBtn} ${applyScope === "zone" ? m.applyScopeBtnActive : ""}`} onClick={() => setApplyScope("zone")}>A zone</button>
                      <button className={`${m.applyScopeBtn} ${applyScope === "custom" ? m.applyScopeBtnActive : ""}`} onClick={() => setApplyScope("custom")}>Custom</button>
                    </div>
                  </div>

                  {applyScope === "zone" && (
                    <div className={m.formRow}>
                      <label className={m.formLabel}>Which zone?</label>
                      <select className={m.formSelect} value={applyZoneId} onChange={(e) => setApplyZoneId(e.target.value)}>
                        <option value="">Select a zone</option>
                        {applyZones.map((z) => (
                          <option key={z.id} value={z.id}>{z.name} ({z.houseCount} houses)</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {applyScope === "custom" && selectedIds.size === 0 && (
                    <p style={{ fontSize: "var(--font-size-text-sm)", color: "var(--text-secondary)", textAlign: "center", padding: "8px 0" }}>
                      Select houses from the table using the checkboxes first.
                    </p>
                  )}

                  {/* Confirmation */}
                  {selectedDueId && (() => {
                    const due = applyDues.find((d) => d.id === selectedDueId)
                    if (!due) return null
                    let count = 0
                    if (applyScope === "all") count = allMembers.filter((m) => m.status === "active").length
                    else if (applyScope === "zone") count = allMembers.filter((m) => m.groupId === applyZoneId && m.status === "active").length
                    else count = filteredMembers.filter((m) => selectedIds.has(m.id) && m.status === "active").length
                    const total = count * due.amountKobo
                    if (count === 0) return null
                    return (
                      <div className={m.applyConfirm}>
                        Apply <strong>{due.title}</strong> (₦{(due.amountKobo / 100).toLocaleString()}) to <strong>{count}</strong> house{count !== 1 ? "s" : " "}?
                        <div className={m.applyConfirmTotal}>Expected ₦{(total / 100).toLocaleString()}</div>
                      </div>
                    )
                  })()}
                </>
              )}
            </div>
            {applyDues.length > 0 && (
              <div className={m.modalFooter}>
                <button className={s.btnSecondary} onClick={() => setShowApplyDue(false)}>Cancel</button>
                <button className={s.btnPrimary} onClick={handleApplyDue} disabled={applying || (() => {
                  if (!selectedDueId) return true
                  if (applyScope === "all") return false
                  if (applyScope === "zone") return !applyZoneId
                  return selectedIds.size === 0
                })()}>
                  {applying ? "Applying..." : "Apply due"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
