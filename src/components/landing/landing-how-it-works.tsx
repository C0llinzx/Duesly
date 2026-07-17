import s from "../../../docs/design/landing.module.css"

export default function LandingHowItWorks() {
  return (
    <section id="how-it-works" className={s.section}>
      <div className="container">
        <div className={`${s["section-head"]} reveal`}>
          <span className="eyebrow">How it works</span>
          <h2>From spreadsheet to settled — in three steps</h2>
        </div>
        <div className={`${s.steps} reveal`}>
          <div className={s.step}>
            <span className={s["step-num"]}>01</span>
            <h3>Add your estate</h3>
            <p>Import zones and units from your spreadsheet, or add them manually. Your roster is ready in minutes.</p>
            <span className={s["step-connector"]} aria-hidden="true" />
          </div>
          <div className={s.step}>
            <span className={s["step-num"]}>02</span>
            <h3>Create a collection</h3>
            <p>Name it, set the amount, pick a due date. Duesly generates a unique shareable link instantly.</p>
            <span className={s["step-connector"]} aria-hidden="true" />
          </div>
          <div className={s.step}>
            <span className={s["step-num"]}>03</span>
            <h3>Share and track</h3>
            <p>Drop the link in your estate WhatsApp group. Watch the dashboard fill in as payments come through.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
