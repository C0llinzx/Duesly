"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import s from "../../../docs/design/landing.module.css"

const faqs = [
  {
    q: "Do residents need to download an app or create an account?",
    a: "No. Residents just tap the payment link, select their zone and unit, confirm by name, and pay. No downloads, no accounts, no passwords to remember.",
  },
  {
    q: "How does the money reach the estate?",
    a: "Funds settle directly to the estate's bank account through Paystack. Duesly never holds or processes your money — we just confirm the payment and update the dashboard.",
  },
  {
    q: "We collect cash and transfers too — can Duesly track those?",
    a: "Yes. The treasurer can manually mark a unit as paid for cash or direct transfer payments. The owing list always reflects reality, online and offline payments combined.",
  },
  {
    q: "What if a resident pays for the wrong unit?",
    a: "Before paying, the resident sees the unit code and the resident name on file. They confirm it's correct before the payment goes through, preventing wrong-unit errors.",
  },
  {
    q: "Can we import our existing resident list?",
    a: "Yes. Upload your Excel or CSV file — Duesly maps Zone, Unit, Resident Name, Phone, and Email columns automatically. Preview the data, fix any issues, and import in one click.",
  },
]

export default function LandingFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  function toggle(index: number) {
    setOpenIndex((prev) => (prev === index ? null : index))
  }

  return (
    <section id="faq" className={s.section}>
      <div className="container">
        <div className={`${s["section-head"]} reveal`}>
          <span className="eyebrow">FAQ</span>
          <h2>Frequently asked questions</h2>
        </div>
        <div className={`${s["faq-wrap"]} reveal`}>
          {faqs.map((faq, i) => {
            const open = openIndex === i
            return (
              <div key={i} className={`${s["faq-item"]}${open ? ` ${s.open}` : ""}`}>
                <button
                  className={s["faq-q"]}
                  onClick={() => toggle(i)}
                  aria-expanded={open}
                >
                  {faq.q}
                  <span className={s["faq-chevron"]}>
                    <Plus size={13} strokeWidth={1.8} />
                  </span>
                </button>
                <div className={s["faq-a"]}>
                  <div className={s["faq-a-inner"]}>
                    <p>{faq.a}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
