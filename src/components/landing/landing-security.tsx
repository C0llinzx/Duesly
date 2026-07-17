import { Building2, Shield, ShieldCheck } from "lucide-react"
import s from "../../../docs/design/landing.module.css"

export default function LandingSecurity() {
  return (
    <section id="security" className={`${s.section} ${s["section-alt"]}`}>
      <div className="container">
        <div className={`${s["section-head"]} reveal`}>
          <span className="eyebrow">Security & trust</span>
          <h2>Your estate's money never touches our hands</h2>
        </div>
        <div className={`${s["security-grid"]} reveal`}>
          <div className={s["security-item"]}>
            <div className={s["bento-icon"]}>
              <Building2 size={18} strokeWidth={1.6} />
            </div>
            <h3>We never hold your money</h3>
            <p>Funds settle directly to your estate's bank account. Duesly is a reconciliation tool, not a wallet.</p>
          </div>
          <div className={s["security-item"]}>
            <div className={s["bento-icon"]}>
              <Shield size={18} strokeWidth={1.6} />
            </div>
            <h3>Paystack-secured</h3>
            <p>All payments are processed securely by Paystack, Nigeria's leading payment gateway. PCI-compliant.</p>
          </div>
          <div className={s["security-item"]}>
            <div className={s["bento-icon"]}>
              <ShieldCheck size={18} strokeWidth={1.6} />
            </div>
            <h3>Data privacy</h3>
            <p>Resident details are kept private and handled in line with Nigeria's Data Protection Act (NDPA 2023).</p>
          </div>
        </div>
      </div>
    </section>
  )
}
