"use client"

import ThemeToggle from "@/components/ThemeToggle"
import d from "./mevolut.module.css"

interface Props {
  estateName: string
}

export default function DashboardHeader({ estateName }: Props) {
  return (
    <header className={d.topBar}>
      <div className={d.topBarLeft}>
        <span className={d.productLabel}>Duesly</span>
        <span className={d.topBarDivider} />
        <span className={d.estateLabel}>{estateName}</span>
      </div>
      <div className={d.topBarRight}>
        <ThemeToggle />
      </div>
    </header>
  )
}
