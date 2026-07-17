import { Check } from "lucide-react"
import s from "../../../docs/design/landing.module.css"

export default function LandingTrust() {
  return (
    <div className={s.trust}>
      <div className={s["trust-inner"]}>
        <span className={s["trust-title"]}>Built for Nigerian estates</span>
        <span className={s["trust-item"]}>
          <Check size={15} />
          No app for residents
        </span>
        <span className={s["trust-item"]}>
          <Check size={15} />
          Funds settle to your estate
        </span>
        <span className={s["trust-item"]}>
          <Check size={15} />
          Set up in minutes
        </span>
        <span className={s["trust-item"]}>
          <Check size={15} />
          Paystack-secured
        </span>
      </div>
    </div>
  )
}
