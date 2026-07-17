"use client"

import { useState } from "react"
import { Moon, Sun } from "lucide-react"

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
      className="theme-toggle"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      <Moon className="icon-moon" size={17} strokeWidth={1.8} />
      <Sun className="icon-sun" size={17} strokeWidth={1.8} />
    </button>
  )
}
