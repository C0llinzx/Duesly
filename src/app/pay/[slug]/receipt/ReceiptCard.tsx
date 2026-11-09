"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Check, X, ArrowLeft, Download, AlertCircle, FileText, Loader2, HelpCircle } from "lucide-react"
import { formatNaira } from "@/lib/money"
import s from "./Receipt.module.css"

export interface ReceiptData {
  status: string
  amountKobo: number
  feeKobo: number
  estateName: string
  collectionTitle: string
  collectionSlug: string
  zoneName: string
  unitLabel: string
  residentName: string | null
  reference: string
  formattedPaidAt: string
  method: string
  maskedEmail: string | null
  treasurerName: string | null
}

interface Props {
  initial: ReceiptData
}

export default function ReceiptCard({ initial }: Props) {
  const [status, setStatus] = useState(initial.status)
  const [attempts, setAttempts] = useState(0)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const maxAttempts = 30

  const drawerRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Polling logic for pending payments
  const poll = useCallback(async () => {
    if (status === "success" || status === "failed" || attempts >= maxAttempts) return

    try {
      const res = await fetch(`/api/pay/status?reference=${encodeURIComponent(initial.reference)}`)
      if (res.ok) {
        const data = await res.json()
        if (data.status && data.status !== status) {
          setStatus(data.status)
        }
      }
    } catch {
      // poll failure is non-fatal
    }
    setAttempts((a) => a + 1)
  }, [status, attempts, initial.reference])

  useEffect(() => {
    if (status !== "pending" && status !== "processing") return
    const timer = setTimeout(poll, 3000)
    return () => clearTimeout(timer)
  }, [poll, status])

  // Escape key closes drawer
  useEffect(() => {
    if (!isDrawerOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsDrawerOpen(false)
      }
    };
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isDrawerOpen])

  // Focus trap for drawer accessibility
  useEffect(() => {
    if (!isDrawerOpen) return
    
    // Focus close button on open
    setTimeout(() => {
      closeButtonRef.current?.focus()
    }, 50)

    const handleFocusTrap = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !drawerRef.current) return
      
      const focusableElements = drawerRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      
      if (focusableElements.length === 0) return
      
      const first = focusableElements[0]
      const last = focusableElements[focusableElements.length - 1]
      
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    window.addEventListener("keydown", handleFocusTrap)
    return () => window.removeEventListener("keydown", handleFocusTrap)
  }, [isDrawerOpen])

  const handlePrint = () => {
    window.print()
  }

  const isPending = status === "pending" || status === "processing"
  const isFailed = status === "failed"
  const isSuccess = status === "success"

  return (
    <>
      {/* ─── SCREEN ONLY CONTENT ─── */}
      <div className={`${s.container} ${s.screenOnly}`}>
        {/* Header (Logo + Estate) */}
        <div className={s.header}>
          <svg
            width="22"
            height="22"
            viewBox="0 0 100 100"
            style={{ transform: "translateY(-2px)", fill: "var(--color-primary)" }}
          >
            <path
              d="M26,52 L48,24 Q50,22 52,24 L74,52 L74,78 Q74,82 70,82 L30,82 Q26,82 26,78 Z M43,82 L43,67 Q43,60 50,60 Q57,60 57,67 L57,82 Z"
              fillRule="evenodd"
            />
          </svg>
          <span className={s.logoText}>{initial.estateName}</span>
        </div>

        {/* Centered Card */}
        <div className={s.card} onClick={() => isSuccess && setIsDrawerOpen(true)} style={{ cursor: isSuccess ? "pointer" : "default" }}>
          
          {/* Status Icon */}
          {isSuccess && (
            <div className={s.iconWrapper}>
              <FileText size={24} strokeWidth={2} />
              <div
                style={{
                  position: "absolute",
                  bottom: -2,
                  right: -2,
                  background: "var(--success)",
                  color: "#fff",
                  borderRadius: "50%",
                  width: 18,
                  height: 18,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "2px solid var(--surface-card)"
                }}
              >
                <Check size={12} strokeWidth={3} />
              </div>
            </div>
          )}

          {isPending && (
            <div className={s.pendingIconWrapper}>
              <Loader2 size={24} className="animate-spin" style={{ animation: "spin 1s linear infinite" }} />
            </div>
          )}

          {isFailed && (
            <div className={s.failedIconWrapper}>
              <AlertCircle size={24} strokeWidth={2} />
            </div>
          )}

          {/* Status Label */}
          <h2 className={s.title}>
            {isSuccess && "Payment received"}
            {isPending && "Confirming your payment…"}
            {isFailed && "Payment not completed"}
          </h2>

          {/* Large Amount */}
          <div className={s.amount}>
            {formatNaira(initial.amountKobo + initial.feeKobo)}
          </div>

          {/* Facts Grid */}
          <div className={s.factsGrid} onClick={(e) => e.stopPropagation()}>
            <div className={s.factRow}>
              <span className={s.factLabel}>Receipt number</span>
              <span className={s.factValue}>{initial.reference}</span>
            </div>
            <div className={s.factRow}>
              <span className={s.factLabel}>Payment date</span>
              <span className={s.factValue}>{initial.formattedPaidAt}</span>
            </div>
            <div className={s.factRow}>
              <span className={s.factLabel}>Channel</span>
              <span className={s.factValue}>{initial.method === "online" ? "Paystack" : "Manual"}</span>
            </div>
            <div className={s.factRow}>
              <span className={s.factLabel}>House</span>
              <span className={s.factValue}>{initial.zoneName} — {initial.unitLabel}</span>
            </div>
            {initial.residentName && (
              <div className={s.factRow}>
                <span className={s.factLabel}>Resident</span>
                <span className={s.factValue}>{initial.residentName}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className={s.actions} onClick={(e) => e.stopPropagation()}>
            {isSuccess && (
              <button className={s.downloadBtn} onClick={handlePrint}>
                <Download size={16} />
                Download receipt
              </button>
            )}
            
            {isSuccess && (
              <button className={s.viewDetailsBtn} onClick={() => setIsDrawerOpen(true)}>
                View details
              </button>
            )}

            {isPending && (
              <p style={{ fontSize: 13, color: "var(--text-tertiary)", margin: 0, textAlign: "center", lineHeight: 1.5 }}>
                {attempts >= maxAttempts
                  ? "Verification is taking longer than expected. Please check back later or contact your estate administrator."
                  : `Verifying transaction status… (${attempts + 1}/${maxAttempts})`}
              </p>
            )}

            {isFailed && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%", alignItems: "center" }}>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0, textAlign: "center", lineHeight: 1.5 }}>
                  This payment attempt was not completed. If you were debited, please contact your estate administrator with the reference above.
                </p>
                <a
                  href={`/pay/${initial.collectionSlug}`}
                  className={s.downloadBtn}
                  style={{ textDecoration: "none" }}
                >
                  <ArrowLeft size={16} style={{ marginRight: 4 }} />
                  Back to payment
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={s.footer}>
          <div className={s.paystackBadge}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ color: "#3ecf8e" }}>
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
            </svg>
            Secured by Paystack
          </div>
          <div className={s.dueslyFooter}>
            Powered by Duesly
          </div>
        </div>
      </div>

      {/* ─── SLIDE-OUT DETAIL DRAWER ─── */}
      {isSuccess && isDrawerOpen && (
        <div className={`${s.scrim} ${s.screenOnly}`} onClick={() => setIsDrawerOpen(false)}>
          <div
            ref={drawerRef}
            className={s.drawer}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Payment Details"
          >
            {/* Drawer Header */}
            <div className={s.drawerHeader}>
              <span className={s.drawerTitle}>Paid on {initial.formattedPaidAt}</span>
              <button
                ref={closeButtonRef}
                className={s.closeBtn}
                onClick={() => setIsDrawerOpen(false)}
                aria-label="Close details"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Body */}
            <div className={s.drawerBody}>
              {/* Summary Section */}
              <div>
                <h3 className={s.sectionTitle}>Summary</h3>
                <div className={s.summaryGrid}>
                  <div className={s.summaryRow}>
                    <span className={s.summaryLabel}>To</span>
                    <span className={s.summaryValue}>{initial.estateName}</span>
                  </div>
                  <div className={s.summaryRow}>
                    <span className={s.summaryLabel}>From</span>
                    <span className={s.summaryValue}>
                      {initial.zoneName} — {initial.unitLabel}
                      {initial.residentName && ` (${initial.residentName})`}
                    </span>
                  </div>
                  {initial.maskedEmail && (
                    <div className={s.summaryRow}>
                      <span className={s.summaryLabel}>Billing Email</span>
                      <span className={s.summaryValue}>{initial.maskedEmail}</span>
                    </div>
                  )}
                  <div className={s.summaryRow}>
                    <span className={s.summaryLabel}>Receipt number</span>
                    <span className={s.summaryValue}>{initial.reference}</span>
                  </div>
                </div>
              </div>

              {/* Items Section */}
              <div>
                <h3 className={s.sectionTitle}>Items</h3>
                <div className={s.itemsList}>
                  <div className={s.itemRow}>
                    <span className={s.itemName}>{initial.collectionTitle}</span>
                    <span className={s.itemValue}>{formatNaira(initial.amountKobo)}</span>
                  </div>
                  {initial.feeKobo > 0 && (
                    <div className={s.itemRow}>
                      <span className={s.itemName}>Service fee</span>
                      <span className={s.itemValue}>{formatNaira(initial.feeKobo)}</span>
                    </div>
                  )}
                  <div className={s.divider} />
                  <div className={s.totalRow}>
                    <span className={s.totalLabel}>Total</span>
                    <span className={s.totalValue}>{formatNaira(initial.amountKobo + initial.feeKobo)}</span>
                  </div>
                  <div className={s.itemRow}>
                    <span className={s.itemName}>Amount paid</span>
                    <span className={s.itemValue}>{formatNaira(initial.amountKobo + initial.feeKobo)}</span>
                  </div>
                  <div className={s.remainingRow}>
                    <span>Amount remaining</span>
                    <span>₦0</span>
                  </div>
                </div>
              </div>

              {/* Questions / Support Box */}
              {initial.treasurerName && (
                <div className={s.contactBox}>
                  <HelpCircle size={20} style={{ color: "var(--text-tertiary)", flexShrink: 0 }} />
                  <div className={s.contactText}>
                    Questions? Contact estate administrator <strong>{initial.treasurerName}</strong>.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── PRINT ONLY LAYOUT ─── */}
      <div className={s.printOnly} style={{ padding: "40px", fontFamily: "system-ui, sans-serif", color: "#111", background: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #e5e7eb", paddingBottom: "20px", marginBottom: "30px" }}>
          <div>
            <h1 style={{ fontSize: "22px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0, color: "#111" }}>Duesly Payment Receipt</h1>
            <p style={{ fontSize: "14px", color: "#4b5563", margin: "4px 0 0" }}>{initial.estateName}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: "13px", fontWeight: "600", margin: 0 }}>Receipt #: {initial.reference}</p>
            <p style={{ fontSize: "12px", color: "#4b5563", margin: "2px 0 0" }}>Date: {initial.formattedPaidAt}</p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px", marginBottom: "40px" }}>
          <div>
            <h3 style={{ fontSize: "11px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em", color: "#6b7280", margin: "0 0 6px" }}>To</h3>
            <p style={{ fontSize: "14px", fontWeight: "600", margin: 0, color: "#111" }}>{initial.estateName}</p>
            {initial.treasurerName && <p style={{ fontSize: "12px", color: "#4b5563", margin: "4px 0 0" }}>Attn: {initial.treasurerName}</p>}
          </div>
          <div>
            <h3 style={{ fontSize: "11px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em", color: "#6b7280", margin: "0 0 6px" }}>From (House / Resident)</h3>
            <p style={{ fontSize: "14px", fontWeight: "600", margin: 0, color: "#111" }}>{initial.zoneName} — {initial.unitLabel}</p>
            {initial.residentName && <p style={{ fontSize: "12px", color: "#4b5563", margin: "4px 0 0" }}>Resident: {initial.residentName}</p>}
            {initial.maskedEmail && <p style={{ fontSize: "12px", color: "#4b5563", margin: "2px 0 0" }}>Email: {initial.maskedEmail}</p>}
          </div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "40px" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #e5e7eb", textAlign: "left" }}>
              <th style={{ padding: "8px 0", fontSize: "11px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em", color: "#6b7280" }}>Item Description</th>
              <th style={{ padding: "8px 0", fontSize: "11px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em", color: "#6b7280", textAlign: "right" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
              <td style={{ padding: "12px 0", fontSize: "14px", color: "#111" }}>{initial.collectionTitle}</td>
              <td style={{ padding: "12px 0", fontSize: "14px", textAlign: "right", fontWeight: "500", color: "#111" }}>{formatNaira(initial.amountKobo)}</td>
            </tr>
            {initial.feeKobo > 0 && (
              <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: "12px 0", fontSize: "14px", color: "#4b5563" }}>Service fee</td>
                <td style={{ padding: "12px 0", fontSize: "14px", textAlign: "right", color: "#4b5563" }}>{formatNaira(initial.feeKobo)}</td>
              </tr>
            )}
            <tr>
              <td style={{ padding: "16px 0 4px", fontSize: "15px", fontWeight: "700", color: "#111" }}>Total Paid</td>
              <td style={{ padding: "16px 0 4px", fontSize: "15px", fontWeight: "700", textAlign: "right", color: "#111" }}>{formatNaira(initial.amountKobo + initial.feeKobo)}</td>
            </tr>
            <tr>
              <td style={{ padding: "4px 0", fontSize: "13px", fontWeight: "600", color: "#16a34a" }}>Amount Remaining</td>
              <td style={{ padding: "4px 0", fontSize: "13px", textAlign: "right", fontWeight: "600", color: "#16a34a" }}>₦0</td>
            </tr>
          </tbody>
        </table>

        <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "20px", textAlign: "center", marginTop: "60px" }}>
          <p style={{ fontSize: "12px", color: "#6b7280", margin: 0 }}>This is a system-generated electronic receipt issued via Duesly.</p>
          <p style={{ fontSize: "11px", color: "#9ca3af", margin: "4px 0 0" }}>Powered by Paystack &bull; Duesly</p>
        </div>
      </div>
    </>
  )
}
