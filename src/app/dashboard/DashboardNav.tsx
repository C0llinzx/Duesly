"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  Wallet,
  LogOut,
  Menu,
  X,
} from "lucide-react"
import Logo from "@/components/Logo"
import d from "./dashboard.module.css"

export default function DashboardNav({ estateName }: { estateName: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    queueMicrotask(() => setOpen(false))
  }, [pathname])

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/auth")
  }

  const links = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/members", label: "Members", icon: Users },
    { href: "/dashboard/collections", label: "Payments", icon: Wallet },
  ]

  return (
    <>
      {open && <div className={d.overlay} onClick={() => setOpen(false)} />}

      <aside className={`${d.sidebar} ${open ? d.sidebarOpen : ""}`}>
        <div className={d.sidebarHeader}>
          <div className={d.sidebarLogo}>
            <Logo size={22} />
            <h1 className={d.sidebarEstateName}>{estateName}</h1>
          </div>
          <p className={d.sidebarEstateSub}>Estate dashboard</p>
        </div>

        <span className={d.sidebarGroupLabel}>Main</span>

        <ul className={d.sidebarNav}>
          {links.map((link) => {
            const Icon = link.icon
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={
                    pathname === link.href ? d.sidebarLinkActive : d.sidebarLink
                  }
                >
                  <Icon size={20} className={d.sidebarLinkIcon} />
                  {link.label}
                </Link>
              </li>
            )
          })}
        </ul>

        <div className={d.sidebarBottom}>
          <button onClick={handleLogout} className={d.sidebarSignOut}>
            <LogOut size={20} className={d.sidebarLinkIcon} />
            Sign Out
          </button>
        </div>
      </aside>

      <button
        className={d.mobileToggle}
        onClick={() => setOpen((p) => !p)}
        aria-label={open ? "Close menu" : "Open menu"}
        style={{ position: "fixed", top: 6, left: 6, zIndex: 40 }}
      >
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>
    </>
  )
}
