"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  Home,
  Wallet,
  Menu,
  X,
  Plus,
  ChevronDown,
  HelpCircle,
  LogOut,
  Receipt,
  Settings,
  CreditCard,
  Shield,
  ArrowUpRight,
} from "lucide-react"
import d from "./mevolut.module.css"

interface Props {
  estateName: string
  userName: string
}

interface NavItem {
  href: string
  label: string
  icon: typeof LayoutDashboard
}

const mainLinks: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/members", label: "Houses & Residents", icon: Home },
  { href: "/dashboard/collections", label: "Dues", icon: Wallet },
]

const recordsLinks: NavItem[] = [
  { href: "/dashboard/payments", label: "Payments", icon: Receipt },
]

function useSectionOpen(key: string, defaultOpen = true): [boolean, (v: boolean) => void] {
  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return defaultOpen
    const stored = localStorage.getItem(`sidebar:${key}`)
    return stored !== null ? stored === "1" : defaultOpen
  })

  useEffect(() => {
    localStorage.setItem(`sidebar:${key}`, open ? "1" : "0")
  }, [key, open])

  return [open, setOpen]
}

function NavSection({
  title,
  items,
  pathname,
  collapsed,
  onToggle,
  onNavigate,
}: {
  title: string
  items: NavItem[]
  pathname: string
  collapsed: boolean
  onToggle: () => void
  onNavigate: () => void
}) {
  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard"
    return pathname.startsWith(href)
  }

  return (
    <div className={d.navSection}>
      <button className={d.sectionLabel} onClick={onToggle}>
        <span>{title}</span>
        <ChevronDown
          size={12}
          strokeWidth={2}
          className={`${d.sectionChevron} ${collapsed ? d.sectionChevronClosed : ""}`}
        />
      </button>
      {!collapsed && (
        <ul className={d.navList} role="list">
          {items.map((link) => {
            const Icon = link.icon
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={isActive(link.href) ? d.navItemActive : d.navItem}
                  onClick={onNavigate}
                >
                  <Icon size={16} strokeWidth={1.75} className={d.navIcon} />
                  <span>{link.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export default function MevolutSidebar({ estateName, userName }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const [prevPathname, setPrevPathname] = useState(pathname)

  const [mainOpen, setMainOpen] = useSectionOpen("main", true)
  const [recordsOpen, setRecordsOpen] = useSectionOpen("records", true)

  if (pathname !== prevPathname) {
    setPrevPathname(pathname)
    setOpen(false)
  }

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

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [menuOpen])

  function handleNavigate() {
    setOpen(false)
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/auth")
  }

  return (
    <>
      {open && <div className={d.overlay} onClick={() => setOpen(false)} />}

      <aside className={`${d.sidebar} ${open ? d.sidebarOpen : ""}`}>
        {/* Sidebar header — workspace switcher */}
        <div className={d.sidebarHeader}>
          <div className={d.workspaceSwitcher} ref={menuRef}>
            <button
              className={d.workspaceBtn}
              onClick={() => setMenuOpen((p) => !p)}
              aria-label="Workspace menu"
              aria-expanded={menuOpen}
            >
              <span className={d.workspaceAvatar}>{initials(userName)}</span>
              <span className={d.workspaceName}>{userName}</span>
              <ChevronDown size={12} strokeWidth={2} className={d.workspaceChevron} />
            </button>
            {menuOpen && (
              <>
                <div className={d.avatarBackdrop} onClick={() => setMenuOpen(false)} />
                <div className={d.avatarDropdown}>
                  <button className={d.avatarDropdownItem} onClick={() => { setMenuOpen(false); router.push("/dashboard/setup") }}>
                    <Settings size={14} strokeWidth={1.75} />
                    Estate settings
                  </button>
                  <button className={d.avatarDropdownItem} onClick={() => { setMenuOpen(false); router.push("/dashboard/collections") }}>
                    <Wallet size={14} strokeWidth={1.75} />
                    Dues
                  </button>
                  <button className={d.avatarDropdownItem}>
                    <HelpCircle size={14} strokeWidth={1.75} />
                    Help &amp; Support
                  </button>
                  <button className={d.avatarDropdownItem}>
                    <CreditCard size={14} strokeWidth={1.75} />
                    Pricing
                  </button>
                  <button className={d.avatarDropdownItem}>
                    <Receipt size={14} strokeWidth={1.75} />
                    Billing
                  </button>
                  <button className={d.avatarDropdownItem}>
                    <Shield size={14} strokeWidth={1.75} />
                    Security
                  </button>
                  <div className={d.avatarDropdownDivider} />
                  <button className={d.avatarDropdownItem} onClick={handleLogout}>
                    <LogOut size={14} strokeWidth={1.75} />
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
          <div className={d.sidebarAddDueWrap}>
            <Link
              href="/dashboard/collections?create=true"
              className={d.sidebarAddDue}
              aria-label="Add a due"
            >
              <Plus size={16} strokeWidth={2} />
            </Link>
            <span className={d.sidebarAddDueTooltip}>Add due</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className={d.navScroll}>
          <NavSection
            title="Main"
            items={mainLinks}
            pathname={pathname}
            collapsed={!mainOpen}
            onToggle={() => setMainOpen(!mainOpen)}
            onNavigate={handleNavigate}
          />
          <NavSection
            title="Records"
            items={recordsLinks}
            pathname={pathname}
            collapsed={!recordsOpen}
            onToggle={() => setRecordsOpen(!recordsOpen)}
            onNavigate={handleNavigate}
          />
        </nav>

        <a href="/?landing=true" target="_blank" rel="noopener noreferrer" className={d.sidebarBackToSite}>
          <ArrowUpRight size={14} strokeWidth={2} />
          Back to site
        </a>

      </aside>

      <button
        className={d.mobileToggle}
        onClick={() => setOpen((p) => !p)}
        aria-label={open ? "Close menu" : "Open menu"}
      >
        {open ? <X size={18} strokeWidth={1.75} /> : <Menu size={18} strokeWidth={1.75} />}
      </button>
    </>
  )
}
