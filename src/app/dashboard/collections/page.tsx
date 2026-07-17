"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { X, Home, AlertCircle, Check, ChevronLeft, ArrowRight, Building2, FileText } from "lucide-react"
import { formatNaira } from "@/lib/money"
import { useToast } from "@/components/ToastProvider"
import d from "../mevolut.module.css"
import s from "@/components/shared.module.css"
import DatePicker from "./DatePicker"
import ntw from "number-to-words"

interface Collection {
  id: string
  title: string
  amountKobo: number
  dueDate: string
  slug: string
  status: string
  createdAt: string
  _count: { payments: number }
}

const MAX_AMOUNT = 10_000_000

function fmtThousands(n: string): string {
  const raw = n.replace(/[^0-9]/g, "").replace(/\..*$/, "")
  if (!raw) return ""
  const val = parseInt(raw, 10)
  if (val > MAX_AMOUNT) return MAX_AMOUNT.toLocaleString("en-US")
  return val.toLocaleString("en-US")
}

function amountInWords(n: number): string {
  if (n === 0) return "zero naira"
  const words = ntw.toWords(n)
  const capped = words.charAt(0).toUpperCase() + words.slice(1)
  return `${capped} naira`
}

function formatWeekday(date: Date): string {
  return date.toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short" })
}

function endOfMonth(): string {
  const d = new Date()
  d.setMonth(d.getMonth() + 1, 0)
  return d.toISOString().slice(0, 10)
}

export default function CollectionsPage() {
  const router = useRouter()
  const [collections, setCollections] = useState<Collection[]>([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ title: "", amount: "", dueDate: "" })
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState("")
  const [loaded, setLoaded] = useState(false)

  // Estate stats for modal context
  const [zoneCount, setZoneCount] = useState(0)
  const [unitCount, setUnitCount] = useState(0)

  // Multi-step create form
  const [step, setStep] = useState(1)
  const [scope, setScope] = useState<"all" | "zones" | "custom">("all")

  // Editing
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null)
  const [editPaymentCount, setEditPaymentCount] = useState(0)
  const [zones, setZones] = useState<{ id: string; name: string; houseCount: number }[]>([])
  const [allUnits, setAllUnits] = useState<{ id: string; label: string; zoneId: string; zoneName: string }[]>([])
  const [selectedZoneIds, setSelectedZoneIds] = useState<Set<string>>(new Set())
  const [selectedUnitIds, setSelectedUnitIds] = useState<Set<string>>(new Set())

  // Filter (Phase 2) — stubbed, hidden until count > 3
  const [filter, setFilter] = useState<"all" | "active" | "closed">("all")

  // Actions (Phase 3)
  const [drawerCollection, setDrawerCollection] = useState<Collection | null>(null)
  const [drawerTitle, setDrawerTitle] = useState("")
  const [drawerAmount, setDrawerAmount] = useState("")
  const [drawerDueDate, setDrawerDueDate] = useState("")
  const [overflowId, setOverflowId] = useState<string | null>(null)
  const [confirmAction, setConfirmAction] = useState<{ type: "close" | "delete" | "reopen"; collection: Collection } | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const { success } = useToast()

  const scopeCount = useMemo(() => {
    if (scope === "all") return unitCount
    if (scope === "zones") return zones.filter((z) => selectedZoneIds.has(z.id)).reduce((s, z) => s + z.houseCount, 0)
    return selectedUnitIds.size
  }, [scope, unitCount, zones, selectedZoneIds, selectedUnitIds])

  const scopeZones = useMemo(() => {
    if (scope === "zones") return zones.filter((z) => selectedZoneIds.has(z.id)).length
    return scope === "all" ? zones.length : 0
  }, [scope, zones, selectedZoneIds])

  useEffect(() => {
    let cancelled = false
    const ctrl = new AbortController()
    Promise.all([
      fetch("/api/dashboard/collections", { signal: ctrl.signal }).then(async (r) => {
        const data = r.ok ? await r.json() : { collections: [] }
        if (!cancelled) setCollections(data.collections ?? [])
      }),
      fetch("/api/dashboard/units", { signal: ctrl.signal }).then(async (r) => {
        if (r.ok) {
          const data = await r.json()
          const zonesData: { id: string; name: string; units: { id: string; label: string }[] }[] = data.zones ?? []
          let total = 0
          const flat: { id: string; label: string; zoneId: string; zoneName: string }[] = []
          const zoneList: { id: string; name: string; houseCount: number }[] = []
          for (const z of zonesData) {
            total += z.units.length
            zoneList.push({ id: z.id, name: z.name, houseCount: z.units.length })
            for (const u of z.units) {
              flat.push({ id: u.id, label: u.label, zoneId: z.id, zoneName: z.name })
            }
          }
          if (!cancelled) {
            setUnitCount(total)
            setZones(zoneList)
            setAllUnits(flat)
          }
        } else if (!cancelled) {
          setUnitCount(0)
        }
      }),
    ])
      .catch(() => {})
      .finally(() => {
        if (!cancelled) {
          setLoaded(true)
          if (new URLSearchParams(window.location.search).get("create") === "true") {
            openCreate()
          }
        }
      })
    return () => { cancelled = true; ctrl.abort() }
  }, [])

  async function reloadCollections() {
    const res = await fetch("/api/dashboard/collections")
    if (res.ok) {
      const data = await res.json()
      setCollections(data.collections ?? [])
    }
  }

  function update(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [field]: e.target.value })
  }

  function rawAmount(): number {
    return parseInt(form.amount.replace(/[^0-9]/g, ""), 10) || 0
  }

  async function openCreate() {
    setForm({ title: "", amount: "", dueDate: endOfMonth() })
    setError("")
    setStep(1)
    setScope("all")
    setSelectedZoneIds(new Set())
    setSelectedUnitIds(new Set())
    setEditingCollection(null)
    setShowModal(true)
  }

  function closeCreate() {
    setShowModal(false)
    setEditingCollection(null)
    setEditPaymentCount(0)
    setError("")
  }

  function openEdit(c: Collection) {
    setDrawerCollection(c)
    setDrawerTitle(c.title)
    setDrawerAmount((c.amountKobo / 100).toLocaleString("en-US"))
    setDrawerDueDate(new Date(c.dueDate).toISOString().slice(0, 10))
  }

  function closeDrawer() {
    setDrawerCollection(null)
  }

  async function saveDrawer() {
    if (!drawerCollection) return
    const amountKobo = Math.round(parseFloat(drawerAmount.replace(/[^0-9.]/g, "")) * 100)
    if (!drawerTitle || !amountKobo || !drawerDueDate) return

    try {
      const res = await fetch(`/api/dashboard/collections/${drawerCollection.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: drawerTitle, amountKobo, dueDate: drawerDueDate }),
      })
      const data = await res.json()
      if (data.ok) {
        setCollections((prev) => prev.map((c) => c.id === drawerCollection.id ? { ...c, title: drawerTitle, amountKobo, dueDate: drawerDueDate } : c))
        closeDrawer()
      }
    } catch {
      // silently fail
    }
  }

  function copyPaymentLink(slug: string) {
    const url = `${window.location.origin}/pay/${slug}`
    navigator.clipboard.writeText(url).then(() => {
      success("Payment link copied")
    })
  }

  async function handleConfirmAction() {
    if (!confirmAction) return
    setConfirmLoading(true)
    try {
      const c = confirmAction.collection
      if (confirmAction.type === "delete") {
        const res = await fetch(`/api/dashboard/collections/${c.id}`, { method: "DELETE" })
        const data = await res.json()
        if (data.ok) {
          setCollections((prev) => prev.filter((x) => x.id !== c.id))
          success("Due deleted")
        }
      } else {
        const newStatus = confirmAction.type === "close" ? "closed" : "active"
        const res = await fetch(`/api/dashboard/collections/${c.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        })
        const data = await res.json()
        if (data.ok) {
          setCollections((prev) => prev.map((x) => x.id === c.id ? { ...x, status: newStatus } : x))
          success(confirmAction.type === "close" ? "Due closed" : "Due reopened")
        }
      }
    } catch {
      // silently fail
    } finally {
      setConfirmLoading(false)
      setConfirmAction(null)
    }
  }

  async function createCollection() {
    setError("")
    setCreating(true)

    try {
      const rawAmount = form.amount.replace(/[^0-9]/g, "")
      const amountNaira = parseFloat(rawAmount)
      if (isNaN(amountNaira) || amountNaira <= 0) {
        setError("Enter a valid amount")
        setCreating(false)
        return
      }

      const amountKobo = Math.round(amountNaira * 100)

      // Step 1: Create the collection
      const res = await fetch("/api/dashboard/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          amountKobo,
          dueDate: new Date(form.dueDate).toISOString(),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Failed to create due")
        setCreating(false)
        return
      }

      const { collection } = await res.json()

      // Step 2: Determine which unit IDs to assign
      let unitIds: string[] = []
      if (scope === "all") {
        unitIds = allUnits.map((u) => u.id)
      } else if (scope === "zones") {
        unitIds = allUnits.filter((u) => selectedZoneIds.has(u.zoneId)).map((u) => u.id)
      } else {
        unitIds = allUnits.map((u) => u.id) // custom defaults to all (user can exclude later)
      }

      // Step 3: Assign to houses
      if (unitIds.length > 0) {
        const assignRes = await fetch("/api/dashboard/assign-due", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ collectionId: collection.id, unitIds }),
        })

        if (!assignRes.ok) {
          setError("Due created but failed to apply to houses")
          setCreating(false)
          return
        }
      }

      closeCreate()
      await reloadCollections()
      router.push(`/dashboard/collections/${collection.id}`)
    } catch {
      setError("Something went wrong")
    } finally {
      setCreating(false)
    }
  }

  async function handleEditSave() {
    if (!editingCollection) return
    setError("")
    setCreating(true)

    try {
      const rawAmount = form.amount.replace(/[^0-9]/g, "")
      const amountNaira = parseFloat(rawAmount)
      if (isNaN(amountNaira) || amountNaira <= 0) {
        setError("Enter a valid amount")
        setCreating(false)
        return
      }

      const res = await fetch(`/api/dashboard/collections/${editingCollection.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          amountKobo: Math.round(amountNaira * 100),
          dueDate: new Date(form.dueDate).toISOString(),
        }),
      })

      if (res.ok) {
        closeCreate()
        await reloadCollections()
      } else {
        const data = await res.json()
        setError(data.error ?? "Failed to update due")
      }
    } catch {
      setError("Something went wrong")
    } finally {
      setCreating(false)
    }
  }

  const sortedCollections = useMemo(() => {
    const order = { active: 0, draft: 1, closed: 2 }
    const filtered = filter === "all"
      ? collections
      : collections.filter((c) => c.status === filter)

    return [...filtered].sort((a, b) => {
      const oa = order[a.status as keyof typeof order] ?? 1
      const ob = order[b.status as keyof typeof order] ?? 1
      if (oa !== ob) return oa - ob

      if (a.status === "active") {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }, [collections, filter])

  if (!loaded) return null

  return (
    <div className={d.mainArea}>
      <header className={d.leviesHeader}>
        <div className={d.leviesHeaderLeft}>
          <h1 className={d.leviesTitle}>Dues</h1>
          <p className={d.leviesSubtitle}>Create a due, share one link, and track who&apos;s paid.</p>
        </div>
        <div className={d.leviesHeaderRight}>
          {collections.length > 3 && (
            <div className={d.leviesFilterVisible}>
              {(["all", "active", "closed"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`${d.leviesFilterBtn} ${filter === f ? d.leviesFilterBtnActive : ""}`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          )}
          <button onClick={openCreate} className={d.primaryBtn}>New due</button>
        </div>
      </header>

      {sortedCollections.length === 0 ? (
        <div className={d.leviesEmpty}>
          <div className={d.leviesEmptyCard}>
            <div className={d.leviesEmptyIcon}>
              <FileText size={24} />
            </div>
            <h2 className={d.leviesEmptyTitle}>Create your first due</h2>
            <p className={d.leviesEmptyDesc}>
              Create a due, share one link, and track who&apos;s paid.
            </p>
            <button onClick={openCreate} className={s.btnPrimary}>New due</button>
          </div>
        </div>
      ) : (
        <div className={d.leviesGrid}>
        {sortedCollections.map((c) => {
          const paidCount = c._count.payments
          const owingCount = unitCount - paidCount
          const collected = paidCount * c.amountKobo
          const outstanding = owingCount * c.amountKobo
          const pct = unitCount > 0 ? Math.round((paidCount / unitCount) * 100) : 0
          const dueDate = new Date(c.dueDate)
          const dueLabel = dueDate.toLocaleDateString("en-NG", { day: "numeric", month: "short" })
          const isClosed = c.status === "closed"

          return (
            <div
              key={c.id}
              className={`${s.card} ${d.levyCard} ${isClosed ? d.levyCardClosed : ""}`}
              onClick={() => router.push(`/dashboard/collections/${c.id}`)}
              style={{ cursor: "pointer" }}
            >
              <div className={d.levyCardHeader}>
                <h3 className={d.levyCardName}>{c.title}</h3>
                <span className={`${d.levyCardBadge} ${isClosed ? d.levyCardBadgeClosed : ""}`}>
                  {isClosed ? "Closed" : "Active"}
                </span>
              </div>

              <p className={d.levyCardMeta}>
                {formatNaira(c.amountKobo)} / house &middot; Estate-wide &middot; Due {dueLabel}
              </p>

              <div className={d.levyCardBarWrap}>
                <div className={d.levyCardBar}>
                  <div
                    className={`${d.levyCardBarFill} ${isClosed ? d.levyCardBarFillClosed : ""}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              <p className={d.levyCardCount}>{paidCount} / {unitCount} paid</p>

              <div className={d.levyCardStats}>
                <div className={d.levyCardStat}>
                  <span className={d.levyCardStatLabel}>Collected</span>
                  <span className={d.levyCardStatValue}>{formatNaira(collected)}</span>
                </div>
                <div className={d.levyCardStat}>
                  <span className={d.levyCardStatLabel}>Outstanding</span>
                  <span className={d.levyCardStatValue}>{formatNaira(outstanding)}</span>
                </div>
              </div>

              {/* ─── Footer actions ─── */}
              <div className={d.levyCardFooter} onClick={(e) => e.stopPropagation()}>
                {isClosed ? (
                  <button
                    className={d.levyCardActionBtn}
                    onClick={() => router.push(`/dashboard/collections/${c.id}`)}
                  >
                    View
                  </button>
                ) : (
                  <>
                    <button className={d.levyCardActionBtn} onClick={() => copyPaymentLink(c.slug)}>
                      Copy link
                    </button>
                    <button className={d.levyCardActionBtnPrimary + " " + d.levyCardActionBtn} onClick={() => openEdit(c)}>
                      Edit
                    </button>
                  </>
                )}
                <div className={d.levyCardActions}>
                  <div className={d.levyCardOverflowWrap}>
                    <button
                      className={d.levyCardOverflowBtn}
                      onClick={() => setOverflowId(overflowId === c.id ? null : c.id)}
                    >
                      ⋯
                    </button>
                    {overflowId === c.id && (
                      <div className={d.levyCardOverflowMenu}>
                        {isClosed ? (
                          <button
                            className={d.levyCardOverflowItem}
                            onClick={() => { setOverflowId(null); setConfirmAction({ type: "reopen", collection: c }) }}
                          >
                            Reopen
                          </button>
                        ) : (
                          <button
                            className={d.levyCardOverflowItem}
                            onClick={() => { setOverflowId(null); setConfirmAction({ type: "close", collection: c }) }}
                          >
                            Close due
                          </button>
                        )}
                        <button
                          className={`${d.levyCardOverflowItem} ${d.levyCardOverflowItemDanger}`}
                          onClick={() => { setOverflowId(null); setConfirmAction({ type: "delete", collection: c }) }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      )}

      {/* ─── Edit drawer ─── */}
      {drawerCollection && (
        <>
          <div className={d.levyDrawerBackdrop} onClick={closeDrawer} />
          <div className={d.levyDrawer}>
            <div className={d.levyDrawerHeader}>
              <h2 className={d.levyDrawerTitle}>Edit due</h2>
              <button className={d.levyDrawerClose} onClick={closeDrawer} aria-label="Close">
                <X size={16} strokeWidth={2} />
              </button>
            </div>
            <div className={d.levyDrawerBody}>
              <div className={d.levyDrawerField}>
                <label className={d.levyDrawerLabel}>Due name</label>
                <input
                  className={d.levyDrawerInput}
                  value={drawerTitle}
                  onChange={(e) => setDrawerTitle(e.target.value)}
                  placeholder="e.g. Security Due, Service Charge"
                />
              </div>
              <div className={d.levyDrawerField}>
                <label className={d.levyDrawerLabel}>Amount per house (₦)</label>
                <input
                  className={d.levyDrawerInput}
                  value={drawerAmount}
                  onChange={(e) => setDrawerAmount(e.target.value)}
                  placeholder="e.g. 5,000"
                />
              </div>
              <div className={d.levyDrawerField}>
                <label className={d.levyDrawerLabel}>Due date</label>
                <input
                  className={d.levyDrawerInput}
                  type="date"
                  value={drawerDueDate}
                  onChange={(e) => setDrawerDueDate(e.target.value)}
                />
              </div>
            </div>
            <div className={d.levyDrawerFooter}>
              <button className={s.btnSecondary} onClick={closeDrawer}>Cancel</button>
              <button className={s.btnPrimary} onClick={saveDrawer}>Save</button>
            </div>
          </div>
        </>
      )}

      {/* ─── Confirm modal ─── */}
      {confirmAction && (
        <div className={d.levyModalBackdrop} onClick={() => setConfirmAction(null)}>
          <div className={d.levyModalCard} onClick={(e) => e.stopPropagation()}>
            <button className={d.levyModalClose} onClick={() => setConfirmAction(null)}>
              <X size={14} />
            </button>
            <div className={`${d.levyModalIcon} ${d.levyModalIconWarning}`}>
              <AlertCircle size={20} />
            </div>
            <div className={d.levyModalTitle}>
              {confirmAction.type === "delete"
                ? "Delete due?"
                : confirmAction.type === "close"
                  ? "Close due?"
                  : "Reopen due?"}
            </div>
            <div className={d.levyModalDesc}>
              {confirmAction.type === "delete"
                ? "This will permanently remove the due and its payment history. This action cannot be undone."
                : confirmAction.type === "close"
                  ? "Closing this due stops new payments. Residents will no longer be able to pay."
                  : "Reopening this due will allow residents to make payments again."}
            </div>
            <div className={d.levyModalActions}>
              <button className={d.levyModalCancel} onClick={() => setConfirmAction(null)}>Cancel</button>
              <button className={d.levyModalConfirm} onClick={handleConfirmAction} disabled={confirmLoading}>
                {confirmLoading
                  ? "Processing…"
                  : confirmAction.type === "delete"
                    ? "Delete"
                    : confirmAction.type === "close"
                      ? "Close"
                      : "Reopen"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Levy Modal (3-step) ── */}
      {showModal && (
        <div className={d.colModal} onClick={closeCreate}>
          <div className={d.lvModalCard} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className={d.lvModalHeader}>
              <div className={d.lvModalHeaderLeft}>
                {step > 1 && (
                  <button className={d.lvBackBtn} onClick={() => setStep((s) => s - 1)} aria-label="Back">
                    <ChevronLeft size={16} strokeWidth={2} />
                  </button>
                )}
                <div>
                  <h2 className={d.lvModalTitle}>{editingCollection ? "Edit due" : "New due"}</h2>
                  <div className={d.lvSteps}>
                    <span className={`${d.lvStepDot} ${step >= 1 ? d.lvStepDotActive : ""}`} />
                    <span className={d.lvStepLine} />
                    <span className={`${d.lvStepDot} ${step >= 2 ? d.lvStepDotActive : ""}`} />
                    <span className={d.lvStepLine} />
                    <span className={`${d.lvStepDot} ${step >= 3 ? d.lvStepDotActive : ""}`} />
                  </div>
                </div>
              </div>
              <button className={d.lvModalClose} onClick={closeCreate} aria-label="Close">
                <X size={18} strokeWidth={1.75} />
              </button>
            </div>

            {unitCount === 0 ? (
              <div className={d.lvModalBody}>
                <div className={d.lvEmptyGuard}>
                  <AlertCircle size={20} />
                  <div>
                    <p className={d.lvEmptyGuardTitle}>No houses in your estate</p>
                    <p className={d.lvEmptyGuardDesc}>Add houses first before creating a due.</p>
                  </div>
                </div>
                <button
                  className={s.btnPrimary}
                  style={{ width: "100%" }}
                  onClick={() => { closeCreate(); router.push("/dashboard/members") }}
                >
                  <Home size={16} strokeWidth={1.75} />
                  Add houses
                </button>
              </div>
            ) : (
              <div className={d.lvModalBody}>
                {error && <p className={d.lvError}>{error}</p>}

                {/* ─── Step 1: What ─── */}
                {step === 1 && (
                  <div className={d.lvStepContent}>
                    <p className={d.lvStepDesc}>Name this due, set the amount, and pick a deadline.</p>

                    <div className={d.lvField}>
                      <label className={d.lvLabel}>Due name</label>
                      <input
                        value={form.title}
                        onChange={update("title")}
                        required
                        className={d.lvInput}
                        placeholder="e.g. Security Due, Service Charge"
                        autoFocus
                      />
                    </div>

                    <div className={d.lvField}>
                      <label className={d.lvLabel}>Amount per house</label>
                      {editingCollection && editPaymentCount > 0 ? (
                        <div className={d.lvLockedAmount}>
                          <div className={d.lvLockedAmountValue}>{formatNaira(editingCollection.amountKobo)}</div>
                          <span className={d.lvLockedAmountNote}>
                            Amount can&apos;t change after payments start. {editPaymentCount} payment{editPaymentCount !== 1 ? "s" : ""} already received.
                          </span>
                        </div>
                      ) : (
                        <div className={d.lvMoneyWrapTight}>
                          <span className={d.lvMoneySign}>₦</span>
                          <input
                            value={form.amount}
                            onChange={(e) => setForm({ ...form, amount: fmtThousands(e.target.value) })}
                            required
                            className={d.lvMoneyInputTight}
                            placeholder="15,000"
                            inputMode="numeric"
                          />
                        </div>
                      )}
                      {form.amount && !(editingCollection && editPaymentCount > 0) && (
                        <>
                          <span className={d.lvMoneyWords}>{amountInWords(rawAmount())}</span>
                          <span className={d.lvMoneyPreview}>
                            × {scopeCount} house{scopeCount !== 1 ? "s" : ""} = {formatNaira(rawAmount() * 100 * scopeCount)} expected
                          </span>
                        </>
                      )}
                    </div>

                    <div className={d.lvField}>
                      <label className={d.lvLabel}>Payment deadline</label>
                      <DatePicker value={form.dueDate} onChange={(iso) => setForm({ ...form, dueDate: iso })} />
                    </div>

                    <div className={d.lvStepActions}>
                      <button
                        className={s.btnPrimary}
                        onClick={() => {
                          if (editingCollection) {
                            handleEditSave()
                          } else {
                            setStep(2)
                          }
                        }}
                        disabled={!form.title.trim() || !form.amount || !form.dueDate}
                        style={{ minHeight: 40 }}
                      >
                        {editingCollection ? "Save changes" : "Continue"}
                        {!editingCollection && <ArrowRight size={14} strokeWidth={2} />}
                      </button>
                    </div>
                  </div>
                )}

                {/* ─── Step 2: Who ─── */}
                {step === 2 && (
                  <div className={d.lvStepContent}>
                    <p className={d.lvStepDesc}>Choose which houses this due applies to.</p>

                    <div className={d.lvScopeRow}>
                      <button
                        className={`${d.lvScopeBtn} ${scope === "all" ? d.lvScopeBtnActive : ""}`}
                        onClick={() => setScope("all")}
                      >
                        <Check size={14} strokeWidth={2.5} className={scope === "all" ? d.lvScopeCheckVisible : d.lvScopeCheckHidden} />
                        <div className={d.lvScopeBtnContent}>
                          <span className={d.lvScopeBtnLabel}>All houses</span>
                          <span className={d.lvScopeBtnCount}>{unitCount} house{unitCount !== 1 ? "s" : ""}</span>
                        </div>
                      </button>
                      <button
                        className={`${d.lvScopeBtn} ${scope === "zones" ? d.lvScopeBtnActive : ""}`}
                        onClick={() => setScope("zones")}
                      >
                        <Check size={14} strokeWidth={2.5} className={scope === "zones" ? d.lvScopeCheckVisible : d.lvScopeCheckHidden} />
                        <div className={d.lvScopeBtnContent}>
                          <span className={d.lvScopeBtnLabel}>By zone</span>
                          <span className={d.lvScopeBtnCount}>{zones.length} zone{zones.length !== 1 ? "s" : ""}</span>
                        </div>
                      </button>
                      <button
                        className={`${d.lvScopeBtn} ${scope === "custom" ? d.lvScopeBtnActive : ""}`}
                        onClick={() => setScope("custom")}
                      >
                        <Check size={14} strokeWidth={2.5} className={scope === "custom" ? d.lvScopeCheckVisible : d.lvScopeCheckHidden} />
                        <div className={d.lvScopeBtnContent}>
                          <span className={d.lvScopeBtnLabel}>Custom selection</span>
                          <span className={d.lvScopeBtnCount}>Pick individual houses</span>
                        </div>
                      </button>
                    </div>

                    {scope === "zones" && (
                      <div className={d.lvZoneList}>
                        {zones.map((z) => (
                          <label key={z.id} className={d.lvZoneRow}>
                            <input
                              type="checkbox"
                              checked={selectedZoneIds.has(z.id)}
                              onChange={() => {
                                const next = new Set(selectedZoneIds)
                                if (next.has(z.id)) next.delete(z.id)
                                else next.add(z.id)
                                setSelectedZoneIds(next)
                              }}
                              className={d.lvZoneCheckbox}
                            />
                            <div className={d.lvZoneInfo}>
                              <span className={d.lvZoneName}>{z.name}</span>
                              <span className={d.lvZoneCount}>{z.houseCount} house{z.houseCount !== 1 ? "s" : ""}</span>
                            </div>
                            <Building2 size={14} strokeWidth={1.75} className={d.lvZoneIcon} />
                          </label>
                        ))}
                      </div>
                    )}

                    {scope === "custom" && (
                      <div className={d.lvCustomNote}>
                        <p className={d.lvHelper}>
                          Select specific houses from the Houses page after creating the due. For now, the due will apply to all houses.
                        </p>
                      </div>
                    )}

                    <div className={d.lvContextBox}>
                      Applies to <span className={d.lvChip}>{scopeCount}</span> house{scopeCount !== 1 ? "s" : ""}
                      {scopeZones > 0 && <> across <span className={d.lvChip}>{scopeZones}</span> zone{scopeZones !== 1 ? "s" : ""}</>}
                      {form.amount && (
                        <> &middot; <span className={`${d.lvChip} ${d.lvChipTotal}`}>{formatNaira(parseInt(form.amount.replace(/[^0-9]/g, ""), 10) * 100 * scopeCount)}</span> expected</>
                      )}
                    </div>

                    <div className={d.lvStepActions}>
                      <button
                        className={s.btnPrimary}
                        onClick={() => setStep(3)}
                        disabled={scope === "zones" && selectedZoneIds.size === 0}
                        style={{ minHeight: 40 }}
                      >
                        Review <ArrowRight size={14} strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                )}

                {/* ─── Step 3: Confirm ─── */}
                {step === 3 && (
                  <div className={d.lvStepContent}>
                    <p className={d.lvStepDesc}>Review the details before creating this due.</p>

                    <div className={d.lvSummaryCard}>
                      <div className={d.lvSummaryRow}>
                        <span className={d.lvSummaryLabel}>Due</span>
                        <span className={d.lvSummaryValue}>{form.title}</span>
                      </div>
                      <div className={d.lvSummaryRow}>
                        <span className={d.lvSummaryLabel}>Amount per house</span>
                        <span className={d.lvSummaryValue}>{formatNaira(parseInt(form.amount.replace(/[^0-9]/g, ""), 10) * 100)}</span>
                      </div>
                      <div className={d.lvSummaryRow}>
                        <span className={d.lvSummaryLabel}>Deadline</span>
                        <span className={d.lvSummaryValue}>{formatWeekday(new Date(form.dueDate + "T12:00:00"))}</span>
                      </div>
                      <div className={d.lvSummaryRow}>
                        <span className={d.lvSummaryLabel}>Applies to</span>
                        <span className={d.lvSummaryValue}>{scopeCount} house{scopeCount !== 1 ? "s" : ""}{scopeZones > 0 ? ` across ${scopeZones} zones` : ""}</span>
                      </div>
                      <div className={d.lvSummaryDivider} />
                      <div className={d.lvSummaryRow}>
                        <span className={d.lvSummaryLabel}>Expected total</span>
                        <span className={d.lvSummaryTotal}>
                          {form.amount ? formatNaira(parseInt(form.amount.replace(/[^0-9]/g, ""), 10) * 100 * scopeCount) : "—"}
                        </span>
                      </div>
                    </div>

                    <p className={d.lvHelper} style={{ marginTop: 12 }}>
                      Creating this due will also apply it to all {scopeCount} houses. This action cannot be undone.
                    </p>

                    <div className={d.lvStepActions}>
                      <button
                        className={s.btnPrimary}
                        onClick={createCollection}
                        disabled={creating}
                        style={{ minHeight: 40, width: "100%" }}
                      >
                        {creating ? "Creating..." : "Create & apply due"}
                      </button>
                      <button
                        type="button"
                        className={s.btnSecondary}
                        onClick={closeCreate}
                        style={{ width: "100%" }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
