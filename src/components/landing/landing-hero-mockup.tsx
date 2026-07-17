import { MessageCircle, Check, Lock } from "lucide-react"
import s from "../../../docs/design/landing.module.css"

const units = [
  { chip: "A · 1A", name: "Olu Adeyemi", status: "paid" as const },
  { chip: "A · 3B", name: "Funke Balogun", status: "owing" as const },
  { chip: "A · 5A", name: "Tunde Bakare", status: "owing" as const },
  { chip: "B · 2C", name: "Emeka Nwosu", status: "paid" as const, note: "paid just now" },
  { chip: "B · 4A", name: "Aisha Mohammed", status: "owing" as const },
]

export default function LandingHeroMockup() {
  return (
    <div className={`${s["hero-mockup-wrap"]} reveal`}>
      {/* floating notification cards */}
      <div className={s["float-card"]} role="presentation">
        <span className={s.wa}>
          <MessageCircle size={16} strokeWidth={1.8} />
        </span>
        <div><b>Reminder sent</b><p>WhatsApp nudge to 9 owing units in Block A & B</p></div>
      </div>
      <div className={`${s["float-card"]} ${s["float-card-2"]}`} role="presentation">
        <span className={s.wa}>
          <Check size={16} strokeWidth={2} />
        </span>
        <div><b>Payment confirmed</b><p>2C — Emeka Nwosu · ₦15,000</p></div>
      </div>

      {/* browser mockup */}
      <div className={s["hero-mockup"]}>
        <div className={s["mockup-chrome"]}>
          <span className={s["chrome-dot"]} />
          <span className={s["chrome-dot"]} />
          <span className={s["chrome-dot"]} />
          <span className={s["chrome-url"]}>
            <Lock size={11} strokeWidth={1.5} />
            duesly.app/dashboard
          </span>
        </div>
        <div className={s["mockup-body"]}>
          {/* sidebar */}
          <div className={s["mockup-side"]}>
            <div className={s["ring-wrap"]}>
              <svg viewBox="0 0 96 96" aria-label="31 of 40 units paid">
                <defs>
                  <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop className={s["ring-grad-start"]} offset="0%" />
                    <stop className={s["ring-grad-end"]} offset="100%" />
                  </linearGradient>
                </defs>
                <circle className={s["ring-track"]} cx="48" cy="48" r="42" />
                <circle className={s["ring-fill"]} cx="48" cy="48" r="42" />
              </svg>
              <div className={s["ring-center"]}>
                <span className={s["ring-frac"]}><span id="ringCount">0</span><small>/40</small></span>
                <span className={s["ring-label"]}>units paid</span>
              </div>
            </div>
            <div className={s["mockup-collection"]}>
              <h4>Service Charge — January</h4>
              <p>₦15,000 per unit · due Jan 31</p>
            </div>
            <div className={s["mockup-stats"]}>
              <div className={`${s["mockup-stat"]} ${s.paid}`}><b>31</b><span>Paid</span></div>
              <div className={`${s["mockup-stat"]} ${s.owing}`}><b>9</b><span>Owing</span></div>
              <div className={s["mockup-stat"]}><b>₦465k</b><span>Collected</span></div>
            </div>
          </div>

          {/* main list */}
          <div className={s["mockup-main"]}>
            <div className={s["mockup-main-head"]}>
              <h4>Units</h4>
              <div className={s["zone-filter"]} role="presentation">
                <span className={`${s["zone-pill"]} ${s.active}`}>All zones</span>
                <span className={s["zone-pill"]}>Block A</span>
                <span className={s["zone-pill"]}>Block B</span>
              </div>
            </div>
            {units.map((u) => (
              <div key={u.chip} className={s["unit-row"]}>
                <span className="mono-chip">{u.chip}</span>
                <span className={s.name}>
                  {u.name}
                  {u.note && <span> · {u.note}</span>}
                </span>
                {u.status === "owing" && <button className={s["remind-btn"]}>Remind</button>}
                <span className={`${s.status} ${s[u.status]}`}>{u.status === "paid" ? "Paid" : "Owing"}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
