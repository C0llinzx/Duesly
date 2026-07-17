"use client"

import { useState } from "react"
import s from "@/components/shared.module.css"

export default function CollectionActions({ collectionId }: { collectionId: string; paymentLink: string }) {
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  async function sendReminders() {
    setSending(true)
    try {
      const res = await fetch("/api/dashboard/send-reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectionId }),
      })
      if (res.ok) {
        setSent(true)
        setTimeout(() => setSent(false), 3000)
      }
    } catch {
      console.error("Failed to send reminders")
    } finally {
      setSending(false)
    }
  }

  function downloadDefaulters() {
    window.open(`/api/dashboard/collections/${collectionId}/defaulters`, "_blank")
  }

  return (
    <div className={s.flexRow} style={{ marginBottom: 24 }}>
      <button onClick={sendReminders} disabled={sending} className={s.btnPrimary}>
        {sending ? "Sending..." : sent ? "Reminders Sent!" : "Send Payment Reminders"}
      </button>
      <button onClick={downloadDefaulters} className={s.btnSecondary}>
        Export Owing List
      </button>
    </div>
  )
}
