import { ArrowRight } from "lucide-react"
import s from "../../../docs/design/landing.module.css"

export default function LandingCTA() {
  return (
    <div className={s.cta}>
      <div className={`${s["cta-band"]} reveal`}>
        <h2>Ready to end the screenshot chaos?</h2>
        <p>Set up your estate in minutes — no credit card required.</p>
        <div className={s["cta-actions"]}>
            <a className={`btn btn-lg ${s["btn-white"]}`} href="/auth">
              Get started with Duesly{" "}
              <ArrowRight className="arrow" size={15} strokeWidth={1.8} />
            </a>
          <a className="btn btn-lg btn-ghost-light" href="#how-it-works">See how it works</a>
        </div>
      </div>
    </div>
  )
}
