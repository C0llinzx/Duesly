import Link from "next/link"
import Logo from "@/components/Logo"
import s from "../../../docs/design/landing.module.css"

export default function LandingFooter() {
  return (
    <footer className={s.footer}>
      <div className={s["footer-inner"]}>
        <Link className={s.logo} href="/">
          <Logo size={26} className={s["logo-mark"]} />
          Duesly
        </Link>
        <div className={s["footer-links"]}>
          <a className={s["footer-link"]} href="#features">Features</a>
          <a className={s["footer-link"]} href="#how-it-works">How it works</a>
          <a className={s["footer-link"]} href="#security">Security</a>
          <a className={s["footer-link"]} href="#faq">FAQ</a>
          <Link className={s["footer-link"]} href="/auth">Get started</Link>
        </div>
      </div>
      <div className={s["footer-bottom"]}>
        <p>© 2026 Duesly. All rights reserved.</p>
        <p>Made in Nigeria 🇳🇬</p>
      </div>
    </footer>
  )
}
