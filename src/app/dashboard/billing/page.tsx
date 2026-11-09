"use client"

import { useState } from "react"
import { Check, ArrowUpRight } from "lucide-react"
import d from "../mevolut.module.css"

const features = [
  "Unlimited levies",
  "Unlimited houses",
  "₦0 transaction fee",
  "Offline payment recording",
  "WhatsApp + email reminders",
  "Reports & export",
  "Remove Duesly branding",
  "Custom pay-link domain",
]

export default function BillingPage() {
  const [annual, setAnnual] = useState(false)

  const price = annual ? 120000 : 12000
  const priceLabel = annual ? "per month, billed annually" : "per month"

  return (
    <div className={d.billingPage}>
      {/* ── Header ── */}
      <header className={d.billingHeader}>
        <div className={d.billingHeaderLeft}>
          <h1 className={d.billingTitle}>Billing</h1>
          <p className={d.billingSubtitle}>
            For questions, <a href="mailto:hello@duesly.app">contact us</a>
          </p>
        </div>
      </header>

      {/* ── Cards Grid ── */}
      <div className={d.billingCards}>
        {/* Current Plan Card */}
        <div className={d.billingPlanCard}>
          <div className={d.billingPlanTop}>
            <div className={d.billingPlanInfo}>
              <div className={d.billingPlanNameRow}>
                <span className={d.billingPlanName}>Starter</span>
                <span className={d.billingCurrentBadge}>Current</span>
              </div>
              <p className={d.billingPlanDesc}>
                Free tier &mdash; pay as you collect. No monthly fee.
              </p>
            </div>
            <div className={d.billingPlanMeter}>
              <div className={d.billingMeterRow}>
                <span className={d.billingMeterLabel}>Transaction fee</span>
                <span className={d.billingMeterValue}>1.5% of Total amount</span>
              </div>
              <div className={d.billingMeterRow}>
                <span className={d.billingMeterLabel}>Active levies</span>
                <span className={d.billingMeterValue}>1 of 1</span>
              </div>
              <div className={d.billingMeterRow}>
                <span className={d.billingMeterLabel}>Registered houses</span>
                <span className={d.billingMeterValue}>14 of 20</span>
              </div>
            </div>
          </div>
          <div className={d.billingPlanActions}>
            <button className={d.billingSecondaryBtn}>Manage</button>
          </div>
        </div>

        {/* Upgrade Card (featured) */}
        <div className={d.billingUpgradeCard}>
          <div className={d.billingUpgradeHeader}>
            <div>
              <div className={d.billingUpgradeTitle}>Upgrade to Estate</div>
              <div className={d.billingUpgradeToggle}>
                <span>Monthly</span>
                <div
                  className={`${d.billingToggleTrack} ${annual ? d.billingToggleTrackActive : ""}`}
                  onClick={() => setAnnual(!annual)}
                  role="switch"
                  aria-checked={annual}
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setAnnual(!annual) } }}
                >
                  <div className={`${d.billingToggleThumb} ${annual ? d.billingToggleThumbActive : ""}`} />
                </div>
                <span>Annual <span style={{ color: "var(--primary)", fontWeight: 600 }}>save 17%</span></span>
              </div>
            </div>
            <div className={d.billingUpgradePrice}>
              <span className={d.billingUpgradeAmount}>₦{(price / 100).toLocaleString()}</span>
              <span className={d.billingUpgradePeriod}>{priceLabel}</span>
            </div>
          </div>

          <div className={d.billingUpgradeBenefit}>
            No transaction fee &mdash; residents pay only the levy amount.
          </div>

          <div className={d.billingFeatureGrid}>
            {features.map((f) => (
              <div key={f} className={d.billingFeatureItem}>
                <span className={d.billingFeatureIcon}>
                  <Check size={10} strokeWidth={3} />
                </span>
                {f}
              </div>
            ))}
          </div>

          <div className={d.billingUpgradeActions}>
            <button className={d.billingPrimaryBtn}>Upgrade now</button>
            <a href="#" className={d.billingUpgradeLink}>
              View all plans <ArrowUpRight size={11} strokeWidth={2} style={{ display: "inline", verticalAlign: "middle" }} />
            </a>
          </div>
        </div>
      </div>

      {/* ── Recent Invoices ── */}
      <div className={d.billingInvoicesCard}>
        <div className={d.billingInvoicesHeader}>
          <h3 className={d.billingInvoicesTitle}>Recent invoices</h3>
        </div>
        <div className={d.billingInvoicesEmpty}>
          <p className={d.billingInvoicesEmptyText}>
            No invoices yet. You&rsquo;re on the free Starter plan.
          </p>
        </div>
      </div>
    </div>
  )
}
