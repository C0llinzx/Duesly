"use client"

import { useState } from "react"
import { Copy, MessageCircle, Check } from "lucide-react"
import d from "../../mevolut.module.css"

export default function ShareActions({ paymentLink, shareMessage }: { paymentLink: string; shareMessage: string }) {
  const [copied, setCopied] = useState(false)

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(paymentLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* fallback */ }
  }

  function shareWhatsApp() {
    const encoded = encodeURIComponent(shareMessage)
    window.open(`https://wa.me/?text=${encoded}`, "_blank")
  }

  return (
    <div className={d.detailShareRow}>
      <div className={d.detailShareField}>
        <span className={d.detailShareLink}>{paymentLink}</span>
        <button onClick={copyLink} className={d.detailShareCopyBtn} aria-label="Copy payment link">
          {copied ? <Check size={14} strokeWidth={2.5} /> : <Copy size={14} strokeWidth={2} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <button onClick={shareWhatsApp} className={d.detailShareWhatsApp}>
        <MessageCircle size={14} strokeWidth={2} />
        Share via WhatsApp
      </button>
    </div>
  )
}
