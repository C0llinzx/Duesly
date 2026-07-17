"use client"

import { useState, useEffect, useCallback } from "react"
import { Check, X } from "lucide-react"
import { formatNaira } from "@/lib/money"
import s from "./PayFlow.module.css"

interface PaymentData {
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
}

export default function ReceiptFlow({ initial }: { initial: PaymentData }) {
  const [status, setStatus] = useState(initial.status)
  const [attempts, setAttempts] = useState(0)
  const [toastVisible, setToastVisible] = useState(false)
  const [toastExited, setToastExited] = useState(false)
  const maxAttempts = 30

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

  // Show toast when payment succeeds
  useEffect(() => {
    if (status === "success") {
      setToastVisible(true)
      const timer = setTimeout(() => dismissToast(), 8000)
      return () => clearTimeout(timer)
    }
  }, [status])

  function dismissToast() {
    setToastExited(true)
    setTimeout(() => setToastVisible(false), 200)
  }

  const isPending = status === "pending" || status === "processing"
  const isFailed = status === "failed"

  return (
    <div className={s.page} style={{ textAlign: "center" }}>
      {/* ── Success Toast ── */}
      {toastVisible && (
        <div className={`${s.payToast} ${toastExited ? s.payToastExit : ""}`}>
          <div className={s.payToastIcon}>
            <Check size={14} strokeWidth={2.5} />
          </div>
          <div className={s.payToastBody}>
            <p className={s.payToastTitle}>
              {formatNaira(initial.amountKobo + initial.feeKobo)} received{initial.residentName ? ` from ${initial.residentName}` : ""}
            </p>
            <p className={s.payToastDesc}>{initial.collectionTitle}</p>
          </div>
          <button className={s.payToastClose} onClick={dismissToast} aria-label="Dismiss">
            <X size={14} strokeWidth={2} />
          </button>
        </div>
      )}

      <div className={s.paidCard}>
        <div className={s.paidIcon}>
          {status === "success" ? "✅" : isFailed ? "❌" : "⏳"}
        </div>
        <h3 className={s.paidTitle}>
          {status === "success"
            ? "Payment confirmed"
            : isFailed
              ? "Payment not completed"
              : "Confirming your payment…"}
        </h3>
        <p className={s.paidDesc}>
          {status === "success"
            ? "Your payment has been received successfully."
            : isFailed
              ? "This payment was not completed. If you were charged, contact your estate administrator — your payment will be reviewed."
              : "Your payment is being verified. This page updates automatically."}
        </p>
      </div>

      <div className={s.dueCard} style={{ textAlign: "left", marginTop: 24 }}>
        <p className={s.dueCollection}>Estate</p>
        <p className={s.dueAddress}>{initial.estateName}</p>

        <p className={s.dueCollection}>Collection</p>
        <p className={s.dueAddress}>{initial.collectionTitle}</p>

        <p className={s.dueCollection}>House</p>
        <p className={s.dueAddress}>{initial.zoneName} — {initial.unitLabel}</p>

        <div className={s.breakdown}>
          <div className={s.breakdownRow}>
            <span className={s.breakdownLabel}>Due amount</span>
            <span className={s.breakdownValue}>{formatNaira(initial.amountKobo)}</span>
          </div>
          {initial.feeKobo > 0 && (
            <div className={s.breakdownRow}>
              <span className={s.breakdownLabel}>Service fee</span>
              <span className={s.breakdownValue}>{formatNaira(initial.feeKobo)}</span>
            </div>
          )}
          <div className={s.breakdownDivider} />
          <div className={`${s.breakdownRow} ${s.breakdownTotal}`}>
            <span className={s.breakdownLabel}>Total paid</span>
            <span className={s.breakdownValue}>{formatNaira(initial.amountKobo + initial.feeKobo)}</span>
          </div>
        </div>

        <p className={s.dueCollection} style={{ marginTop: 8 }}>Reference</p>
        <p style={{ fontSize: 12, color: "var(--text-tertiary)", margin: 0, wordBreak: "break-all" }}>
          {initial.reference}
        </p>
      </div>

      {isPending && (
        <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 16 }}>
          {attempts >= maxAttempts
            ? "Verification is taking longer than expected. Please check back later or contact your estate administrator."
            : `Checking… (${attempts + 1})`}
        </p>
      )}

      {isFailed && (
        <a
          href={`/pay/${initial.collectionSlug}`}
          className={s.payBtn}
          style={{ display: "inline-flex", marginTop: 24, textDecoration: "none", width: "auto", padding: "14px 32px" }}
        >
          Try again
        </a>
      )}
    </div>
  )
}
