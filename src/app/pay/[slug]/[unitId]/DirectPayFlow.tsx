"use client"

import { useState } from "react"
import { formatNaira } from "@/lib/money"
import s from "../PayFlow.module.css"

export default function DirectPayFlow({
  collectionId,
  unitId,
  title,
  amountKobo,
  feeKobo,
  feeDisplay,
  address,
  residentName,
  maskedEmail,
  isPaid,
}: {
  collectionId: string
  unitId: string
  title: string
  amountKobo: number
  feeKobo: number
  feeDisplay: { label: string; description: string }
  address: string
  residentName: string | null
  maskedEmail: string | null
  isPaid: boolean
}) {
  const [confirmed, setConfirmed] = useState(false)
  const [emailMode, setEmailMode] = useState<"masked" | "input">(maskedEmail ? "masked" : "input")
  const [customEmail, setCustomEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const displayAmount = formatNaira(amountKobo)
  const displayFee = formatNaira(feeKobo)
  const displayTotal = formatNaira(amountKobo + feeKobo)

  function isValidEmail(e: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
  }

  function getPayEmail(): string | undefined {
    if (emailMode === "input" && isValidEmail(customEmail)) return customEmail
    return undefined
  }

  async function handlePay() {
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/pay/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectionId, unitId, email: getPayEmail() }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? "Payment initiation failed")
        return
      }

      window.location.assign(data.authorizationUrl)
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (isPaid) {
    return (
      <div className={s.page}>
        <div className={s.paidCard}>
          <div className={s.paidIcon}>✅</div>
          <h3 className={s.paidTitle}>Already paid</h3>
          <p className={s.paidDesc}>
            This house has already been paid for {title}.
          </p>
        </div>
      </div>
    )
  }

  if (!confirmed) {
    return (
      <div className={s.page}>
        <div className={s.dueCard}>
          <p className={s.dueCollection}>{title}</p>
          <p className={s.dueAddress}>{address}</p>
          {residentName && (
            <p className={s.dueResident}>Resident: {residentName}</p>
          )}

          <div className={s.breakdown}>
            <div className={s.breakdownRow}>
              <span className={s.breakdownLabel}>Due amount</span>
              <span className={s.breakdownValue}>{displayAmount}</span>
            </div>
            <div className={s.breakdownRow}>
              <span className={s.breakdownLabel}>Service fee</span>
              <span className={s.breakdownValue}>{displayFee}</span>
            </div>
            <div className={s.breakdownDivider} />
            <div className={`${s.breakdownRow} ${s.breakdownTotal}`}>
              <span className={s.breakdownLabel}>Total</span>
              <span className={s.breakdownValue}>{displayTotal}</span>
            </div>
          </div>
          <p className={s.breakdownNote}>{feeDisplay.description}</p>

          {emailMode === "masked" && maskedEmail ? (
            <div className={s.emailConfirm}>
              <p className={s.emailConfirmText}>
                We&apos;ll send your receipt to <span className={s.confirmName}>{maskedEmail}</span>. Is this right?
              </p>
              <div className={s.emailConfirmBtns}>
                <button className={s.emailBtnSecondary} onClick={() => { setEmailMode("input"); setCustomEmail("") }}>
                  Use a different email
                </button>
                <button className={s.emailBtnPrimary} onClick={() => setConfirmed(true)}>
                  Yes, that&apos;s correct
                </button>
              </div>
            </div>
          ) : (
            <div className={s.emailConfirm}>
              <p className={s.emailConfirmText}>Enter the email for your payment receipt.</p>
              <input
                className={s.emailInput}
                type="email"
                placeholder="you@example.com"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                autoFocus
              />
              <div className={s.emailConfirmBtns}>
                {maskedEmail && (
                  <button className={s.emailBtnSecondary} onClick={() => setEmailMode("masked")}>
                    ← Back
                  </button>
                )}
                <button
                  className={s.emailBtnPrimary}
                  disabled={!isValidEmail(customEmail)}
                  onClick={() => setConfirmed(true)}
                >
                  Continue
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={s.page}>
      <div className={s.dueCard}>
        <p className={s.dueCollection}>{title}</p>
        <p className={s.dueAddress}>{address}</p>
        {residentName && (
          <p className={s.dueResident}>Resident: {residentName}</p>
        )}

        <div className={s.breakdown}>
          <div className={s.breakdownRow}>
            <span className={s.breakdownLabel}>Due amount</span>
            <span className={s.breakdownValue}>{displayAmount}</span>
          </div>
          <div className={s.breakdownRow}>
            <span className={s.breakdownLabel}>Service fee</span>
            <span className={s.breakdownValue}>{displayFee}</span>
          </div>
          <div className={s.breakdownDivider} />
          <div className={`${s.breakdownRow} ${s.breakdownTotal}`}>
            <span className={s.breakdownLabel}>Total</span>
            <span className={s.breakdownValue}>{displayTotal}</span>
          </div>
        </div>
        <p className={s.breakdownNote}>{feeDisplay.description}</p>
      </div>

      <p style={{ fontSize: 13, color: "var(--text-secondary)", textAlign: "center", marginBottom: 16 }}>
        You&apos;ll be redirected to Paystack to complete payment.
      </p>

      {error && <div className={s.errorBox} style={{ marginBottom: 16 }}>{error}</div>}

      <div className={s.stickyBar} style={{ position: "static", borderTop: "none", padding: 0 }}>
        <div className={s.stickyBarInner}>
          <button className={s.payBtn} onClick={handlePay} disabled={loading}>
            {loading ? "Redirecting to Paystack…" : `Confirm & pay ${displayTotal}`}
          </button>
        </div>
      </div>
    </div>
  )
}
