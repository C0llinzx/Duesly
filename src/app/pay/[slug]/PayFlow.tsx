"use client"

import { useState, useEffect } from "react"
import { Moon, Sun } from "lucide-react"
import { formatNaira } from "@/lib/money"
import s from "./PayFlow.module.css"

interface Unit {
  id: string
  label: string
  address: string | null
  residentName: string | null
  maskedEmail: string | null
  isPaid: boolean
}

interface Zone {
  id: string
  name: string
  units: Unit[]
}

type Step = "zones" | "units" | "confirm" | "email" | "due"

export default function PayFlow({
  zones,
  collectionId,
  amountKobo,
  feeKobo,
  feeDisplay,
  estateName,
  collectionTitle,
}: {
  zones: Zone[]
  collectionId: string
  amountKobo: number
  feeKobo: number
  feeDisplay: { label: string; description: string }
  estateName: string
  collectionTitle: string
}) {
  const [step, setStep] = useState<Step>("zones")
  const [selectedZoneId, setSelectedZoneId] = useState("")
  const [selectedUnitId, setSelectedUnitId] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [theme, setTheme] = useState<"dark" | "light">("dark")
  const [emailMode, setEmailMode] = useState<"masked" | "input">("masked")
  const [customEmail, setCustomEmail] = useState("")

  useEffect(() => {
    const stored = localStorage.getItem("duesly-theme") as "dark" | "light" | null
    if (stored) {
      setTheme(stored)
    } else if (window.matchMedia("(prefers-color-scheme: light)").matches) {
      setTheme("light")
    }
  }, [])

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark"
    document.documentElement.setAttribute("data-theme", next)
    localStorage.setItem("duesly-theme", next)
    setTheme(next)
  }

  const selectedZone = zones.find((z) => z.id === selectedZoneId)
  const selectedUnit = selectedZone?.units.find((u) => u.id === selectedUnitId)

  function goBackToUnits() {
    setSelectedUnitId("")
    setStep("units")
  }

  function goBackToZones() {
    setSelectedZoneId("")
    setSelectedUnitId("")
    setStep("zones")
  }

  function goToEmailStep() {
    if (selectedUnit?.maskedEmail) {
      setEmailMode("masked")
    } else {
      setEmailMode("input")
      setCustomEmail("")
    }
    setStep("email")
  }

  function isValidEmail(e: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
  }

  function getPayEmail(): string | undefined {
    if (emailMode === "input" && isValidEmail(customEmail)) return customEmail
    return undefined
  }

  async function handlePay() {
    if (!selectedUnit || selectedUnit.isPaid) return
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/pay/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectionId, unitId: selectedUnit.id, email: getPayEmail() }),
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

  const displayAmount = formatNaira(amountKobo)
  const displayFee = formatNaira(feeKobo)
  const displayTotal = formatNaira(amountKobo + feeKobo)
  const address = selectedUnit?.address || selectedUnit?.label || ""

  return (
    <div className={s.page}>
      <header className={s.header}>
        <h1 className={s.estateName}>{estateName}</h1>
        <p className={s.collectionTitle}>{collectionTitle}</p>
        <button className={s.themeToggle} onClick={toggleTheme} aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
          <Moon className={s.iconMoon} size={16} strokeWidth={1.8} />
          <Sun className={s.iconSun} size={16} strokeWidth={1.8} />
        </button>
      </header>

      {/* ── Step 1: Zone picker ── */}
      {step === "zones" && (
        <div className={s.stepActive}>
          <p className={s.stepLabel}>Select your zone</p>
          <div className={s.zoneList}>
            {zones.map((zone) => (
              <button key={zone.id} className={s.zoneBtn} onClick={() => { setSelectedZoneId(zone.id); setStep("units") }}>
                {zone.name}
              </button>
            ))}
          </div>
          <div className={s.infoBox}>
            <p className={s.infoBoxTitle}>Can&apos;t find your address?</p>
            <p className={s.infoBoxDesc}>
              Contact your estate treasurer to be added to the roster.
            </p>
          </div>
        </div>
      )}

      {/* ── Step 1b: Street/unit picker ── */}
      {step === "units" && (
        <div className={s.stepActive}>
          <button className={s.backLink} onClick={goBackToZones}>← Back to zones</button>
          <p className={s.stepLabel}>Select your street</p>
          <div className={s.unitList}>
            {selectedZone?.units.map((unit) => (
              <button
                key={unit.id}
                className={s.unitBtn}
                disabled={unit.isPaid}
                onClick={() => { setSelectedUnitId(unit.id); setStep("confirm") }}
              >
                <div className={s.unitAddress}>{unit.address || unit.label}</div>
                {unit.isPaid && <div className={s.unitPaidBadge}>Paid</div>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Step 2: Name confirmation ── */}
      {step === "confirm" && (
        <div className={s.stepActive}>
          <button className={s.backLink} onClick={goBackToUnits}>← Back to streets</button>
          {selectedUnit?.residentName ? (
            <>
              <div className={s.confirmCard}>
                <p className={s.confirmAddress}>{address}</p>
                <p className={s.confirmPrompt}>
                  Is this <span className={s.confirmName}>{selectedUnit.residentName}</span>&apos;s house?
                </p>
              </div>
              <div className={s.confirmBtns}>
                <button className={`${s.confirmBtn} ${s.confirmBtnNo}`} onClick={goBackToUnits}>
                  No, go back
                </button>
                <button className={`${s.confirmBtn} ${s.confirmBtnYes}`} onClick={goToEmailStep}>
                  Yes, continue
                </button>
              </div>
            </>
          ) : (
            <>
              <div className={s.confirmCard}>
                <p className={s.confirmAddress}>{address}</p>
                <p className={s.confirmPrompt}>Is this your house?</p>
              </div>
              <div className={s.confirmBtns}>
                <button className={`${s.confirmBtn} ${s.confirmBtnNo}`} onClick={goBackToUnits}>
                  No, go back
                </button>
                <button className={`${s.confirmBtn} ${s.confirmBtnYes}`} onClick={goToEmailStep}>
                  Yes, continue
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Step 2b: Email confirmation ── */}
      {step === "email" && (
        <div className={s.stepActive}>
          <button className={s.backLink} onClick={() => setStep("confirm")}>← Back</button>
          {emailMode === "masked" && selectedUnit?.maskedEmail ? (
            <>
              <div className={s.confirmCard}>
                <p className={s.confirmAddress}>Receipt email</p>
                <p className={s.confirmPrompt}>
                  We&apos;ll send your receipt to <span className={s.confirmName}>{selectedUnit.maskedEmail}</span>. Is this right?
                </p>
              </div>
              <div className={s.confirmBtns}>
                <button className={`${s.confirmBtn} ${s.confirmBtnNo}`} onClick={() => { setEmailMode("input"); setCustomEmail("") }}>
                  Use a different email
                </button>
                <button className={`${s.confirmBtn} ${s.confirmBtnYes}`} onClick={() => setStep("due")}>
                  Yes, that&apos;s correct
                </button>
              </div>
            </>
          ) : (
            <>
              <div className={s.confirmCard}>
                <p className={s.confirmAddress}>Receipt email</p>
                <p className={s.confirmPrompt}>Enter the email address where you&apos;d like to receive your payment receipt.</p>
                <input
                  className={s.emailInput}
                  type="email"
                  placeholder="you@example.com"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  autoFocus
                />
              </div>
              <div className={s.confirmBtns}>
                {selectedUnit?.maskedEmail && (
                  <button className={`${s.confirmBtn} ${s.confirmBtnNo}`} onClick={() => setEmailMode("masked")}>
                    ← Back
                  </button>
                )}
                <button
                  className={`${s.confirmBtn} ${s.confirmBtnYes}`}
                  disabled={!isValidEmail(customEmail)}
                  onClick={() => setStep("due")}
                >
                  Continue
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Step 3: Due display ── */}
      {step === "due" && (
        <div className={s.stepActive}>
          <button className={s.backLink} onClick={() => setStep("email")}>← Back</button>
          {selectedUnit?.isPaid ? (
            <div className={s.paidCard}>
              <div className={s.paidIcon}>✅</div>
              <h3 className={s.paidTitle}>You&apos;re all paid</h3>
              <p className={s.paidDesc}>
                {selectedUnit.residentName ? `${selectedUnit.residentName}` : "This house"} has already paid for {collectionTitle}.
              </p>
            </div>
          ) : (
            <>
              <div className={s.dueCard}>
                <p className={s.dueCollection}>{collectionTitle}</p>
                <p className={s.dueAddress}>{address}</p>
                {selectedUnit?.residentName && (
                  <p className={s.dueResident}>Resident: {selectedUnit.residentName}</p>
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

              {error && <div className={s.errorBox} style={{ marginBottom: 16 }}>{error}</div>}
            </>
          )}
        </div>
      )}

      {/* ── Sticky pay bar (only on owing due step) ── */}
      {step === "due" && selectedUnit && !selectedUnit.isPaid && (
        <div className={s.stickyBar}>
          <div className={s.stickyBarInner}>
            <button className={s.payBtn} onClick={handlePay} disabled={loading}>
              {loading ? "Redirecting to Paystack…" : `Pay ${displayTotal}`}
            </button>
            <button className={s.backBtn} onClick={() => setStep("email")}>
              ← Change house
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
