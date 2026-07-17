"use client"

import { useState } from "react"
import s from "@/components/shared.module.css"

export default function CopyLinkButton({ paymentLink }: { paymentLink: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(paymentLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* fallback */
    }
  }

  return (
    <button onClick={copy} className={s.btnSecondary} style={{ marginBottom: 8 }}>
      {copied ? "Copied!" : "Copy Payment Link"}
    </button>
  )
}
