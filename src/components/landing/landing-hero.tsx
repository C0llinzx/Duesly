import Link from "next/link"
import { ArrowRight, Check } from "lucide-react"
import s from "../../../docs/design/landing.module.css"
import LandingHeroMockup from "./landing-hero-mockup"

export default function LandingHero() {
  return (
    <header className={s.hero}>
      <div className={s["hero-bg"]} aria-hidden="true" />
      <div className={s["hero-inner"]}>
        <div className={s["hero-badge"]}>
          <span className={s["dot-pill"]}>NEW</span>
          Built for Nigerian estates · Powered by Paystack
        </div>
        <h1>
          Know exactly who's paid. And{" "}
          <span className={s.owing}>
            who hasn't.
            <svg viewBox="0 0 200 12" preserveAspectRatio="none" aria-hidden="true"><path d="M2 9C50 3 120 2 198 7" stroke="currentColor" strokeWidth="4" strokeLinecap="round" fill="none" /></svg>
          </span>
        </h1>
        <p className={s["hero-sub"]}>
          Duesly lets your estate share one payment link and watch a live paid-vs-owing dashboard fill in by zone — no app for residents, and your money settles straight to the estate.
        </p>
        <div className={s["hero-actions"]}>
          <Link className="btn btn-primary btn-lg" href="/auth">
            Get started free{" "}
            <ArrowRight className="arrow" size={15} strokeWidth={1.8} />
          </Link>
          <Link className="btn btn-secondary btn-lg" href="#how-it-works">See how it works</Link>
        </div>
        <p className={s["hero-note"]}>
          <Check size={14} />
          No credit card required · Set up in minutes
        </p>
      </div>
      <LandingHeroMockup />
    </header>
  )
}
