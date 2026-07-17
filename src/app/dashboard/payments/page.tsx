"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import {
  Download,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  CreditCard,
  Banknote,
  Receipt,
  Copy,
  Check,
} from "lucide-react"
import { formatNaira } from "@/lib/money"
import DatePicker from "../collections/DatePicker"
import d from "../mevolut.module.css"

interface Payment {
  id: string
  amountKobo: number
  method: string
  status: string
  gatewayTxRef: string | null
  gatewayTxId: string | null
  paidAt: string
  createdAt: string
  unitLabel: string
  address: string | null
  residentName: string | null
  zoneName: string
  collectionId: string
  collectionTitle: string
}

interface Collection { id: string; title: string }

interface Filters {
  query: string
  collectionId: string
  method: string
  from: string
  to: string
}

function channelLabel(method: string): string {
  return method === "online" || method === "paystack" ? "Paystack" : "Manual"
}

function channelIcon(method: string) {
  return method === "online" || method === "paystack"
    ? <CreditCard size={11} />
    : <Banknote size={11} />
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const SortIcon = ({ active, dir }: { active: boolean; dir: "asc" | "desc" }) =>
  active ? (
    dir === "asc" ? <ChevronUp size={12} strokeWidth={2} /> : <ChevronDown size={12} strokeWidth={2} />
  ) : (
    <ArrowUpDown size={12} strokeWidth={1.5} className={d.paySortIconInactive} />
  )

function SkeletonRow() {
  return (
    <tr>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <td key={i} className={d.paymentsTd}>
          <div className={d.paySkeleton} style={{ width: i === 3 ? 80 : i === 5 ? 60 : 100, height: 13 }} />
        </td>
      ))}
    </tr>
  )
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function handleCopy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button className={d.payCopyBtn} onClick={handleCopy} title="Copy">
      {copied ? <Check size={12} strokeWidth={2} /> : <Copy size={12} strokeWidth={2} />}
    </button>
  )
}

function StatusPill({ status }: { status: string }) {
  const cls = status === "success" ? d.payStatusSuccess : status === "failed" ? d.payStatusFailed : d.payStatusPending
  return <span className={`${d.payStatusPill} ${cls}`}>{status}</span>
}

function MobileSkeletonCard() {
  return (
    <div className={d.payMobileCard}>
      <div className={d.payMobileCardTop}>
        <div className={d.paySkeleton} style={{ width: 120, height: 13 }} />
        <div className={d.paySkeleton} style={{ width: 60, height: 18, borderRadius: 999 }} />
      </div>
      <div className={d.paySkeleton} style={{ width: 80, height: 12, marginTop: 8 }} />
      <div className={d.paySkeleton} style={{ width: 140, height: 12, marginTop: 4 }} />
      <div className={d.paySkeleton} style={{ width: 90, height: 12, marginTop: 4 }} />
    </div>
  )
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [sortBy, setSortBy] = useState<"paidAt" | "amountKobo">("paidAt")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const [filters, setFilters] = useState<Filters>({
    query: "",
    collectionId: "",
    method: "",
    from: "",
    to: "",
  })

  const activeFilterCount = [filters.collectionId, filters.method, filters.from, filters.to].filter(Boolean).length
  const hasAnyFilter = activeFilterCount > 0 || filters.query.length > 0

  const toggleSort = (col: "paidAt" | "amountKobo") => {
    if (sortBy === col) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"))
    } else {
      setSortBy(col)
      setSortDir("desc")
    }
  }

  const fetchPayments = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set("page", String(page))
    params.set("limit", "50")
    params.set("sortBy", sortBy)
    params.set("sortDir", sortDir)
    if (filters.query) params.set("query", filters.query)
    if (filters.collectionId) params.set("collectionId", filters.collectionId)
    if (filters.method) params.set("method", filters.method)
    if (filters.from) params.set("from", filters.from)
    if (filters.to) params.set("to", filters.to)

    try {
      const res = await fetch(`/api/dashboard/payments?${params}`)
      if (res.ok) {
        const data = await res.json()
        setPayments(data.payments)
        setCollections(data.collections)
        setTotal(data.total)
        setTotalPages(data.totalPages)
      }
    } catch { /* silent */ }
    setLoading(false)
  }, [page, filters, sortBy, sortDir])

  useEffect(() => { fetchPayments() }, [fetchPayments])
  useEffect(() => { setPage(1) }, [filters, sortBy, sortDir])

  function handleExport() {
    const params = new URLSearchParams()
    params.set("csv", "1")
    if (filters.query) params.set("query", filters.query)
    if (filters.collectionId) params.set("collectionId", filters.collectionId)
    if (filters.method) params.set("method", filters.method)
    if (filters.from) params.set("from", filters.from)
    if (filters.to) params.set("to", filters.to)
    window.open(`/api/dashboard/payments?${params}`, "_blank")
  }

  function clearFilters() {
    setFilters({ query: "", collectionId: "", method: "", from: "", to: "" })
  }

  const summary = useMemo(() => {
    const totalCollected = payments.reduce((s, p) => s + p.amountKobo, 0)
    const paystack = payments.filter((p) => p.method === "online" || p.method === "paystack").length
    return { totalCollected, count: payments.length, paystack }
  }, [payments])

  return (
    <div className={d.mainArea}>
      {/* ─── Header ─── */}
      <header className={d.pageHeader}>
        <div className={d.pageHeaderLeft}>
          <h1 className={d.pageTitle}>Payments</h1>
          <span className={d.paymentsCount}>
            {loading
              ? "…"
              : hasAnyFilter
                ? `${total} transaction${total !== 1 ? "s" : ""} · filtered`
                : `${total} transaction${total !== 1 ? "s" : ""}`}
          </span>
        </div>
        <div className={d.pageHeaderActions}>
          <button className={d.paymentsFilterBtn} onClick={() => setShowFilters((p) => !p)}>
            <Search size={14} strokeWidth={2} />
            Filters
            {activeFilterCount > 0 && <span className={d.paymentsFilterBadge}>{activeFilterCount}</span>}
          </button>
          <button className={d.paymentsExportBtn} onClick={handleExport} disabled={total === 0}>
            <Download size={14} strokeWidth={2} />
            Export CSV
          </button>
        </div>
      </header>

      {/* ─── Summary Tiles ─── */}
      {!loading && payments.length > 0 && (
        <div className={d.paySummaryGrid}>
          <div className={d.paySummaryTile}>
            <span className={d.paySummaryLabel}>Total collected</span>
            <span className={d.paySummaryValue}>{formatNaira(summary.totalCollected)}</span>
          </div>
          <div className={d.paySummaryTile}>
            <span className={d.paySummaryLabel}>Transactions</span>
            <span className={d.paySummaryValue}>{summary.count}</span>
          </div>
          <div className={d.paySummaryTile}>
            <span className={d.paySummaryLabel}>Channel</span>
            <span className={d.paySummaryValue}>
              <span className={d.paySummarySplit}>
                <span className={d.paySummaryOnline} />
                {summary.paystack} Paystack
              </span>
            </span>
          </div>
        </div>
      )}

      {/* ─── Filter Bar ─── */}
      {showFilters && (
        <div className={d.paymentsFilterBar}>
          <div className={d.paySearchWrap}>
            <Search size={16} className={d.paySearchIcon} />
            <input
              type="text"
              className={d.paySearchInput}
              placeholder="Search by resident or house…"
              value={filters.query}
              onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
            />
            {filters.query && (
              <button className={d.paySearchClear} onClick={() => setFilters((f) => ({ ...f, query: "" }))}>
                <X size={12} strokeWidth={2} />
              </button>
            )}
          </div>
          <select
            className={d.paymentsFilterSelect}
            value={filters.collectionId}
            onChange={(e) => setFilters((f) => ({ ...f, collectionId: e.target.value }))}
          >
            <option value="">All dues</option>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
          <select
            className={d.paymentsFilterSelect}
            value={filters.method}
            onChange={(e) => setFilters((f) => ({ ...f, method: e.target.value }))}
          >
            <option value="">All channels</option>
            <option value="online">Paystack</option>
            <option value="offline">Manual</option>
          </select>
          <DatePicker
            value={filters.from}
            onChange={(iso) => setFilters((f) => ({ ...f, from: iso }))}
            compact
          />
          <DatePicker
            value={filters.to}
            onChange={(iso) => setFilters((f) => ({ ...f, to: iso }))}
            compact
          />
          {hasAnyFilter && (
            <button className={d.paymentsFilterClear} onClick={clearFilters}>
              <X size={12} strokeWidth={2} />
              Clear
            </button>
          )}
        </div>
      )}

      {/* ─── Table / Cards ─── */}
      <div className={d.paymentsCard}>
        {loading ? (
          <>
            <div className={`${d.paymentsTableWrap} ${d.payDesktopOnly}`}>
              <table className={d.paymentsTable}>
                <thead>
                  <tr>
                    <th className={d.paymentsTh}>Date</th>
                    <th className={d.paymentsTh}>Resident</th>
                    <th className={d.paymentsTh}>House</th>
                    <th className={d.paymentsTh}>Due</th>
                    <th className={`${d.paymentsTh} ${d.paymentsThRight}`}>Amount</th>
                    <th className={`${d.paymentsTh} ${d.paymentsThRight}`}>Channel</th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4, 5].map((i) => <SkeletonRow key={i} />)}
                </tbody>
              </table>
            </div>
            <div className={d.payMobileOnly}>
              {[1, 2, 3].map((i) => <MobileSkeletonCard key={i} />)}
            </div>
          </>
        ) : payments.length === 0 && hasAnyFilter ? (
          <div className={d.paymentsEmpty}>
            <Search size={32} strokeWidth={1.25} className={d.paymentsEmptyIcon} />
            <span>No payments match your filters</span>
            <button className={d.payEmptyCta} onClick={clearFilters}>Clear filters</button>
          </div>
        ) : payments.length === 0 ? (
          <div className={d.paymentsEmpty}>
            <Receipt size={32} strokeWidth={1.25} className={d.paymentsEmptyIcon} />
            <span>No payments yet</span>
          </div>
        ) : (
          <>
            {/* ─── Desktop Table ─── */}
            <div className={`${d.paymentsTableWrap} ${d.payDesktopOnly}`}>
              <table className={d.paymentsTable}>
                <thead>
                  <tr>
                    <th className={d.paymentsTh}>
                      <button className={d.paySortableTh} onClick={() => toggleSort("paidAt")}>
                        Date
                        <SortIcon active={sortBy === "paidAt"} dir={sortDir} />
                      </button>
                    </th>
                    <th className={d.paymentsTh}>Resident</th>
                    <th className={d.paymentsTh}>Address</th>
                    <th className={d.paymentsTh}>Due</th>
                    <th className={`${d.paymentsTh} ${d.paymentsThRight}`}>
                      <button className={`${d.paySortableTh} ${d.paySortableThRight}`} onClick={() => toggleSort("amountKobo")}>
                        Amount
                        <SortIcon active={sortBy === "amountKobo"} dir={sortDir} />
                      </button>
                    </th>
                    <th className={`${d.paymentsTh} ${d.paymentsThRight}`}>Channel</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className={d.paymentsTr} onClick={() => setSelectedPayment(p)}>
                      <td className={d.paymentsTd}>
                        <span className={d.paymentsDateSingle}>{formatDate(p.paidAt)} · {formatTime(p.paidAt)}</span>
                      </td>
                      <td className={d.paymentsTd}>
                        <span className={d.paymentsResident}>{p.residentName ?? "—"}</span>
                      </td>
                      <td className={d.paymentsTd}>
                        <span className={d.payAddress} title={p.address ?? p.unitLabel}>
                          {p.address || p.unitLabel}
                        </span>
                      </td>
                      <td className={d.paymentsTd}>
                        <span className={d.paymentsLevy}>{p.collectionTitle}</span>
                      </td>
                      <td className={`${d.paymentsTd} ${d.paymentsTdRight}`}>
                        <span className={d.paymentsAmount}>{formatNaira(p.amountKobo)}</span>
                      </td>
                      <td className={`${d.paymentsTd} ${d.paymentsTdRight}`}>
                        <span
                          className={`${d.paymentsMethod} ${p.method === "online" || p.method === "paystack" ? d.paymentsMethodOnline : d.paymentsMethodOffline}`}
                          title={p.method === "offline" || p.method === "manual" ? "Cash or transfer, recorded by treasurer" : undefined}
                        >
                          {channelIcon(p.method)}
                          {channelLabel(p.method)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ─── Mobile Cards ─── */}
            <div className={d.payMobileOnly}>
              {payments.map((p) => (
                <div key={p.id} className={d.payMobileCard} onClick={() => setSelectedPayment(p)}>
                  <div className={d.payMobileCardTop}>
                    <span className={d.paymentsAmount}>{formatNaira(p.amountKobo)}</span>
                    <span
                      className={`${d.paymentsMethod} ${p.method === "online" || p.method === "paystack" ? d.paymentsMethodOnline : d.paymentsMethodOffline}`}
                    >
                      {channelLabel(p.method)}
                    </span>
                  </div>
                  <div className={d.payMobileCardMeta}>
                    <span className={d.payMobileResident}>{p.residentName ?? "—"}</span>
                    <span className={d.payMobileHouse}>{p.unitLabel} · {p.zoneName}</span>
                  </div>
                  <div className={d.payMobileCardFooter}>
                    <span className={d.paymentsDate}>{formatDate(p.paidAt)}</span>
                    <span className={d.paymentsTime}>{formatTime(p.paidAt)}</span>
                    <span className={d.payMobileLevy}>{p.collectionTitle}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* ─── Pagination ─── */}
            {totalPages > 1 && (
              <div className={d.paymentsPagination}>
                <button
                  className={d.paymentsPageBtn}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  <ChevronLeft size={14} />
                </button>
                <span className={d.paymentsPageInfo}>
                  {page} of {totalPages}
                </span>
                <button
                  className={d.paymentsPageBtn}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ─── Payment Detail Drawer ─── */}
      {selectedPayment && (
        <>
          <div className={d.payDrawerBackdrop} onClick={() => setSelectedPayment(null)} />
          <div className={d.payDrawer}>
            <div className={d.payDrawerHeader}>
              <h2 className={d.payDrawerTitle}>Payment detail</h2>
              <button className={d.payDrawerClose} onClick={() => setSelectedPayment(null)}>
                <X size={16} strokeWidth={2} />
              </button>
            </div>
            <div className={d.payDrawerBody}>
              {/* ── Hero ── */}
              <div className={d.payDrawerHero}>
                <span className={d.payDrawerAmount}>{formatNaira(selectedPayment.amountKobo)}</span>
                <div className={d.payDrawerPills}>
                  <span
                    className={`${d.paymentsMethod} ${selectedPayment.method === "online" || selectedPayment.method === "paystack" ? d.paymentsMethodOnline : d.paymentsMethodOffline}`}
                  >
                    {channelIcon(selectedPayment.method)}
                    {channelLabel(selectedPayment.method)}
                  </span>
                  <StatusPill status={selectedPayment.status} />
                </div>
              </div>

              {/* ── Who / Where ── */}
              <div className={d.payDrawerSection}>
                <div className={d.payDrawerSectionLabel}>Who / Where</div>
                <div className={d.payDrawerField}>
                  <span className={d.payDrawerLabel}>Resident</span>
                  <span className={d.payDrawerValue}>{selectedPayment.residentName ?? "—"}</span>
                </div>
                <div className={d.payDrawerField}>
                  <span className={d.payDrawerLabel}>Address</span>
                  <span className={d.payDrawerValue}>{selectedPayment.address || selectedPayment.unitLabel} · {selectedPayment.zoneName}</span>
                </div>
                <div className={d.payDrawerField}>
                  <span className={d.payDrawerLabel}>Due</span>
                  <span className={d.payDrawerValue}>{selectedPayment.collectionTitle}</span>
                </div>
              </div>

              <div className={d.payDrawerDivider} />

              {/* ── When ── */}
              <div className={d.payDrawerSection}>
                <div className={d.payDrawerSectionLabel}>When</div>
                <div className={d.payDrawerField}>
                  <span className={d.payDrawerLabel}>Date &amp; time</span>
                  <span className={d.payDrawerValue}>{formatDateTime(selectedPayment.paidAt)}</span>
                </div>
              </div>

              <div className={d.payDrawerDivider} />

              {/* ── Transaction ── */}
              <div className={d.payDrawerSection}>
                <div className={d.payDrawerSectionLabel}>Transaction</div>
                <div className={d.payDrawerField}>
                  <span className={d.payDrawerLabel}>Reference</span>
                  <div className={d.payDrawerMonoRow}>
                    <span className={d.payDrawerMono}>{selectedPayment.gatewayTxRef ?? "—"}</span>
                    {selectedPayment.gatewayTxRef && <CopyBtn text={selectedPayment.gatewayTxRef} />}
                  </div>
                </div>
                {selectedPayment.gatewayTxId && (
                  <div className={d.payDrawerField}>
                    <span className={d.payDrawerLabel}>Gateway ID</span>
                    <div className={d.payDrawerMonoRow}>
                      <span className={d.payDrawerMono}>{selectedPayment.gatewayTxId}</span>
                      <CopyBtn text={selectedPayment.gatewayTxId} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
