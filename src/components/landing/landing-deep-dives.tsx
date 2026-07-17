import { Check } from "lucide-react"
import s from "../../../docs/design/landing.module.css"
import FeatureDeepDive from "./feature-deep-dive"

export default function LandingDeepDives() {
  return (
    <section className={`${s.section} ${s["section-alt"]}`}>
      <div className="container">
        <FeatureDeepDive
          step="STEP 01 / SET UP"
          title="Set up once"
          description="Bring the roster you already have. Import your Excel or CSV with zones, units, names, and phone numbers in one step."
          points={[
            "A live preview flags messy rows before they reach your database",
            "Re-imports update existing units and add new ones — never a duplicate",
            "Zone, Unit, Resident, Phone and Email columns mapped automatically",
          ]}
          stageClass="stage-a"
        >
          <div className={s["visual-chrome"]}>
            <span className={s["chrome-dot"]} />
            <span className={s["chrome-dot"]} />
            <span className={s["chrome-dot"]} />
            <span>csv-import-preview</span>
          </div>
          <div className={s["visual-body"]}>
            <table className={s["csv-table"]}>
              <thead>
                <tr><th>Zone</th><th>Unit</th><th>Resident</th><th>Phone</th></tr>
              </thead>
              <tbody>
                <tr><td><span className="mono-chip">Block A</span></td><td>1A</td><td>Olu Adeyemi</td><td>0803…</td></tr>
                <tr><td><span className="mono-chip">Block A</span></td><td>1B</td><td>Chioma Obi</td><td>0805…</td></tr>
                <tr><td><span className="mono-chip">Block B</span></td><td>2A</td><td>Emeka Nwosu</td><td>0703…</td></tr>
              </tbody>
            </table>
            <div className={s["csv-ok"]}>
              <Check size={15} />
              40 rows validated · 0 issues · Ready to import
            </div>
          </div>
        </FeatureDeepDive>

        <FeatureDeepDive
          step="STEP 02 / COLLECT"
          title="Share one link"
          description="Collecting is just a link in the group chat. Residents tap it, select their zone and unit, confirm by name, and pay — all on their phone, no app needed."
          points={[
            "One link works for everyone in the estate",
            "Duplicate payments are blocked automatically",
          ]}
          stageClass="stage-b"
          reverse
        >
          <div className={s["visual-chrome"]}>
            <span className={s["chrome-dot"]} />
            <span className={s["chrome-dot"]} />
            <span className={s["chrome-dot"]} />
            <span>payment-flow</span>
          </div>
          <div className={s["visual-body"]}>
            <div className={s.payflow}>
              <div className={`${s["payflow-step"]} ${s.done}`}>
                <span className={s["payflow-num"]}>
                  <Check size={13} />
                </span>
                <div><b>Select zone</b><small>Block B</small></div>
                <span className="mono-chip">B</span>
              </div>
              <div className={`${s["payflow-step"]} ${s.done}`}>
                <span className={s["payflow-num"]}>
                  <Check size={13} />
                </span>
                <div><b>Select unit</b><small>Unit 2C</small></div>
                <span className="mono-chip">B · 2C</span>
              </div>
              <div className={`${s["payflow-step"]} ${s.done}`}>
                <span className={s["payflow-num"]}>
                  <Check size={13} />
                </span>
                <div><b>Confirm resident</b><small>Emeka Nwosu — that's me</small></div>
              </div>
              <div className={`${s["payflow-step"]} ${s.active}`}>
                <span className={s["payflow-num"]}>4</span>
                <div><b>Pay ₦15,000</b><small>Secured by Paystack</small></div>
              </div>
            </div>
          </div>
        </FeatureDeepDive>

        <FeatureDeepDive
          step="STEP 03 / TRACK"
          title="See who's owing"
          description="Reconciliation, done for you. The dashboard shows a live progress ring, a zone-filterable owing list, and one-tap WhatsApp reminders."
          points={[
            "Offline payments fold into the same view",
            "Every unit is either paid or owing — always accurate",
          ]}
          stageClass="stage-c"
        >
          <div className={s["visual-chrome"]}>
            <span className={s["chrome-dot"]} />
            <span className={s["chrome-dot"]} />
            <span className={s["chrome-dot"]} />
            <span>dashboard-overview</span>
          </div>
          <div className={s["visual-body"]}>
            <div className={s["dash-stats"]}>
              <div className={`${s["dash-stat"]} ${s.g}`}>
                <div className={s["dash-stat-top"]}><b>31</b><span>Paid</span></div>
                <div className={s["dash-bar"]}><i data-w="77.5%" /></div>
              </div>
              <div className={`${s["dash-stat"]} ${s.o}`}>
                <div className={s["dash-stat-top"]}><b>9</b><span>Owing</span></div>
                <div className={s["dash-bar"]}><i data-w="22.5%" /></div>
              </div>
              <div className={`${s["dash-stat"]} ${s.g}`}>
                <div className={s["dash-stat-top"]}><b>₦465,000</b><span>Collected</span></div>
                <div className={s["dash-bar"]}><i data-w="77.5%" /></div>
              </div>
            </div>
          </div>
        </FeatureDeepDive>
      </div>
    </section>
  )
}
