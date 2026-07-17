"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Menu } from "lucide-react"
import Logo from "@/components/Logo"
import s from "../../../docs/design/landing.module.css"
import ThemeToggle from "@/components/ThemeToggle"

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const closeMenu = useCallback(() => setMenuOpen(false), [])

  return (
    <nav id="nav" className={`${s.nav}${scrolled ? ` ${s.scrolled}` : ""}`}>
      <div className={s["nav-inner"]}>
        <Link className={s.logo} href="/">
          <Logo size={26} className={s["logo-mark"]} />
          Duesly
        </Link>

        <ul className={s["nav-links"]}>
          <li><a className={s["nav-link"]} href="#features">Features</a></li>
          <li><a className={s["nav-link"]} href="#how-it-works">How it works</a></li>
          <li><a className={s["nav-link"]} href="#security">Security</a></li>
          <li><a className={s["nav-link"]} href="#faq">FAQ</a></li>
        </ul>

        <div className={s["nav-right"]}>
          <ThemeToggle />
          <Link className={`btn btn-primary ${s["nav-cta"]}`} href="/auth">Get started</Link>
          <button className={s["mobile-menu-btn"]} onClick={() => setMenuOpen((o) => !o)} aria-expanded={menuOpen} aria-label="Open menu">
            <Menu size={22} strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className={`${s["mobile-menu"]}${menuOpen ? ` ${s.open}` : ""}`}>
        <a className={s["nav-link"]} href="#features" onClick={closeMenu}>Features</a>
        <a className={s["nav-link"]} href="#how-it-works" onClick={closeMenu}>How it works</a>
        <a className={s["nav-link"]} href="#security" onClick={closeMenu}>Security</a>
        <a className={s["nav-link"]} href="#faq" onClick={closeMenu}>FAQ</a>
        <Link className="btn btn-primary" href="/auth" style={{ width: "100%", marginTop: 6 }} onClick={closeMenu}>Get started</Link>
      </div>
    </nav>
  )
}
