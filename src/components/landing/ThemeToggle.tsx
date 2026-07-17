"use client"

import { useState } from "react"
import s from "../../app/(marketing)/_styles/landing.module.css"

function getInitialTheme(): "dark" | "light" {
  if (typeof window === "undefined") return "dark"
  return (document.documentElement.getAttribute("data-theme") as "dark" | "light") ?? "dark"
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">(getInitialTheme)

  function toggle() {
    const next = theme === "dark" ? "light" : "dark"
    document.documentElement.setAttribute("data-theme", next)
    localStorage.setItem("duesly-theme", next)
    setTheme(next)
  }

  return (
    <button
      className={s["theme-toggle"]}
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      <svg className={s["icon-moon"]} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M20.5 14.1A8.5 8.5 0 0 1 9.9 3.5a8.5 8.5 0 1 0 10.6 10.6z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
      <svg className={s["icon-sun"]} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 2.5v2.4M12 19.1v2.4M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.9 19.1l1.7-1.7M17.4 6.6l1.7-1.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </button>
  )
}
