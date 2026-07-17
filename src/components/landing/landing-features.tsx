import { PieChart, Link as LinkIcon, FileText, Mail, Building2, ShieldCheck, Smartphone, Lock } from "lucide-react"
import s from "../../../docs/design/landing.module.css"

export default function LandingFeatures() {
  return (
    <section id="features" className={s.section}>
      <div className="container">
        <div className={`${s["section-head"]} reveal`}>
          <span className="eyebrow">Features</span>
          <h2>Everything a treasurer needs. Nothing residents have to learn.</h2>
          <p>From roster import to reconciled dashboard — Duesly handles the whole collection cycle.</p>
        </div>

        <div className={s.bento}>
          {/* A — Live paid-vs-owing (mini-dashboard inside) */}
          <div className={`${s["bento-card"]} ${s["bento-a"]} reveal`}>
            <div className={s["bento-icon"]}>
              <PieChart size={18} strokeWidth={1.6} />
            </div>
            <h3>Live paid-vs-owing</h3>
            <p>A dashboard that reconciles itself — see who's paid and who's owing, filtered by zone.</p>
            <div className={s["bento-mini"]}>
              <div className={s["ring-wrap"]}>
                <svg viewBox="0 0 96 96" aria-hidden="true">
                  <defs>
                    <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop className={s["ring-grad-start"]} offset="0%" />
                      <stop className={s["ring-grad-end"]} offset="100%" />
                    </linearGradient>
                  </defs>
                  <circle className={s["ring-track"]} cx="48" cy="48" r="42" />
                  <circle className={s["ring-fill"]} cx="48" cy="48" r="42" />
                </svg>
                <div className={s["ring-center"]}><span className={s["ring-frac"]}>78<small>%</small></span></div>
              </div>
              <div className={s["bento-mini-stats"]}>
                <div className={`${s["bento-mini-stat"]} ${s.paid}`}><span>Paid</span><b>31</b></div>
                <div className={`${s["bento-mini-stat"]} ${s.owing}`}><span>Owing</span><b>9</b></div>
                <div className={s["bento-mini-stat"]}><span>Collected</span><b>₦465k</b></div>
              </div>
            </div>
          </div>

          {/* B — One link, no app (link-demo inside) */}
          <div className={`${s["bento-card"]} ${s["bento-b"]} reveal`}>
            <div className={s["bento-icon"]}>
              <LinkIcon size={18} strokeWidth={1.6} />
            </div>
            <h3>One link, no app</h3>
            <p>Residents tap a link, pick their unit, and pay. No downloads, no accounts.</p>
            <div className={s["bento-link-demo"]}>
              <Lock size={13} strokeWidth={1.5} />
              <span>duesly.app/pay/harmony-estate-jan</span>
              <span className={s.copy}>Copy</span>
            </div>
          </div>

          {/* C — Import your roster */}
          <div className={`${s["bento-card"]} ${s["bento-c"]} reveal`}>
            <div className={s["bento-icon"]}>
              <FileText size={18} strokeWidth={1.6} />
            </div>
            <h3>Import your roster</h3>
            <p>Upload your existing Excel — zones, units, names, phones — in one step.</p>
          </div>

          {/* D — Reminders that land */}
          <div className={`${s["bento-card"]} ${s["bento-d"]} reveal`}>
            <div className={s["bento-icon"]}>
              <Mail size={18} strokeWidth={1.6} />
            </div>
            <h3>Reminders that land</h3>
            <p>One-tap WhatsApp nudges, plus email, to everyone still owing.</p>
          </div>

          {/* E — Your money, your account */}
          <div className={`${s["bento-card"]} ${s["bento-e"]} reveal`}>
            <div className={s["bento-icon"]}>
              <Building2 size={18} strokeWidth={1.6} />
            </div>
            <h3>Your money, your account</h3>
            <p>Funds settle straight to the estate. Duesly never holds your money.</p>
          </div>

          {/* F — Confirm the right unit */}
          <div className={`${s["bento-card"]} ${s["bento-f"]} reveal`}>
            <div className={s["bento-icon"]}>
              <ShieldCheck size={18} strokeWidth={1.6} />
            </div>
            <h3>Confirm the right unit</h3>
            <p>Payers see the unit code and resident name before paying — no mistakes.</p>
          </div>

          {/* G — Offline payments too */}
          <div className={`${s["bento-card"]} ${s["bento-g"]} reveal`}>
            <div className={s["bento-icon"]}>
              <Smartphone size={18} strokeWidth={1.6} />
            </div>
            <h3>Offline payments too</h3>
            <p>Record cash and transfer payments so the owing list always reflects reality.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
