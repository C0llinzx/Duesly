"use client"

import { useState, useEffect, useCallback } from "react"
import { X, MessageCircle, Mail, ChevronRight, Check, ArrowLeft } from "lucide-react"
import { whatsappDeepLink, paymentReminderMessage } from "@/lib/whatsapp"
import d from "../../mevolut.module.css"

interface OweUnit {
  id: string
  label: string
  residentName: string | null
  phone1: string | null
  residentEmail: string | null
}

interface Props {
  open: boolean
  onClose: () => void
  onToast: (msg: string) => void
  collectionId: string
  collectionTitle: string
  estateName: string
  amount: string
  dueDate: string
  paymentLink: string
  owingUnits: OweUnit[]
}

const RATE_LIMIT_MS = 24 * 60 * 60 * 1000

function getRateLimitMap(channel: string): Record<string, number> {
  try {
    const raw = localStorage.getItem(`reminder_${channel}`)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function isRateLimited(channel: string, unitId: string): boolean {
  const map = getRateLimitMap(channel)
  const ts = map[unitId]
  return !!ts && Date.now() - ts < RATE_LIMIT_MS
}

function markSent(channel: string, unitId: string) {
  const map = getRateLimitMap(channel)
  map[unitId] = Date.now()
  localStorage.setItem(`reminder_${channel}`, JSON.stringify(map))
}

type ModalStep = "choose" | "email_result" | "wa_queue" | "wa_result"

export default function SendRemindersModal({
  open,
  onClose,
  onToast,
  collectionId,
  collectionTitle,
  estateName,
  amount,
  dueDate,
  paymentLink,
  owingUnits,
}: Props) {
  const [step, setStep] = useState<ModalStep>("choose")
  const [channel, setChannel] = useState<"whatsapp" | "email">("whatsapp")
  const [sending, setSending] = useState(false)
  const [waIndex, setWaIndex] = useState(0)
  const [waSentCount, setWaSentCount] = useState(0)
  const [emailSentCount, setEmailSentCount] = useState(0)
  const [, forceRender] = useState(0)

  const rerender = useCallback(() => forceRender((n) => n + 1), [])

  useEffect(() => {
    if (open) {
      setStep("choose")
      setChannel("whatsapp")
      setSending(false)
      setWaIndex(0)
      setWaSentCount(0)
      setEmailSentCount(0)
      forceRender((n) => n + 1)
    }
  }, [open, rerender])

  const whatsappQueue = owingUnits.filter(
    (u) => u.phone1 && !isRateLimited("whatsapp", u.id),
  )
  const emailQueue = owingUnits.filter(
    (u) => u.residentEmail && !isRateLimited("email", u.id),
  )
  const waSkipped = owingUnits.length - whatsappQueue.length
  const emailSkipped = owingUnits.length - emailQueue.length

  const currentWaHouse = whatsappQueue[waIndex] ?? null
  const waTotal = whatsappQueue.length

  if (!open) return null

  async function handleSendEmail() {
    if (emailQueue.length === 0) return
    setSending(true)
    try {
      const res = await fetch("/api/dashboard/send-reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectionId }),
      })
      const data = await res.json()
      if (res.ok) {
        emailQueue.forEach((u) => markSent("email", u.id))
        setEmailSentCount(data.sent ?? emailQueue.length)
        setStep("email_result")
      } else {
        onToast(data.error ?? "Failed to send reminders")
      }
    } catch {
      onToast("Failed to send reminders")
    } finally {
      setSending(false)
    }
  }

  function handleWaSend() {
    if (!currentWaHouse) return
    markSent("whatsapp", currentWaHouse.id)
    setWaSentCount((n) => n + 1)
  }

  function handleWaSkip() {
    if (!currentWaHouse) return
    setWaIndex((i) => i + 1)
  }

  function handleWaDone() {
    handleWaSend()
    setWaIndex((i) => i + 1)
  }

  function handleWaFinish() {
    setStep("wa_result")
  }

  if (step === "email_result") {
    const skipped = owingUnits.length - emailSentCount
    return (
      <div className={d.remModal} onClick={onClose}>
        <div className={d.remModalCard} onClick={(e) => e.stopPropagation()}>
          <button className={d.remModalClose} onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
          <div className={d.remDoneIcon}>
            <Check size={24} />
          </div>
          <div className={d.remDoneTitle}>Email reminders sent</div>
          <div className={d.remDoneDesc}>
            {emailSentCount} reminder{emailSentCount !== 1 ? "s" : ""} sent{skipped > 0 ? ` · ${skipped} skipped` : ""}.
          </div>
          <div className={d.remModalActions}>
            <button className={d.remBtnPrimary} onClick={onClose}>Done</button>
          </div>
        </div>
      </div>
    )
  }

  if (step === "wa_result") {
    return (
      <div className={d.remModal} onClick={onClose}>
        <div className={d.remModalCard} onClick={(e) => e.stopPropagation()}>
          <button className={d.remModalClose} onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
          <div className={d.remDoneIcon}>
            <Check size={24} />
          </div>
          <div className={d.remDoneTitle}>WhatsApp reminders complete</div>
          <div className={d.remDoneDesc}>
            {waSentCount} of {waTotal} houses prompted via WhatsApp.
          </div>
          <div className={d.remModalActions}>
            <button className={d.remBtnPrimary} onClick={onClose}>Done</button>
          </div>
        </div>
      </div>
    )
  }

  if (step === "wa_queue" && currentWaHouse && waIndex < waTotal) {
    const msg = paymentReminderMessage({
      estateName,
      collectionTitle,
      amount,
      dueDate,
      unitLabel: currentWaHouse.label,
      paymentLink,
    })
    const waLink = whatsappDeepLink(currentWaHouse.phone1!, msg)

    return (
      <div className={d.remModal} onClick={onClose}>
        <div className={d.remModalCard} onClick={(e) => e.stopPropagation()}>
          <button className={d.remModalClose} onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>

          <div className={d.remWaHeader}>
            <button className={d.remBackBtn} onClick={() => setStep("choose")}>
              <ArrowLeft size={16} />
            </button>
            <div>
              <div className={d.remWaTitle}>WhatsApp reminders</div>
              <div className={d.remWaProgress}>{waSentCount} of {waTotal} sent</div>
            </div>
          </div>

          <div className={d.remWaProgressTrack}>
            <div className={d.remWaProgressFill} style={{ width: `${(waSentCount / waTotal) * 100}%` }} />
          </div>

          <div className={d.remWaHouse}>
            <div className={d.remWaHouseLabel}>{currentWaHouse.label}</div>
            {currentWaHouse.residentName && (
              <div className={d.remWaHouseName}>{currentWaHouse.residentName}</div>
            )}
          </div>

          <div className={d.remWaPreview}>
            <div className={d.remWaPreviewLabel}>Message preview</div>
            <div className={d.remWaPreviewMsg}>{msg}</div>
          </div>

          <p className={d.remWaNote}>
            Each message is sent by you through WhatsApp, one at a time.
          </p>

          <div className={d.remModalActions}>
            <button className={d.remBtnSecondary} onClick={handleWaSkip}>
              Skip
            </button>
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className={d.remBtnWhatsApp}
              onClick={handleWaSend}
            >
              <MessageCircle size={14} />
              Open WhatsApp
            </a>
          </div>

          <button className={d.remDoneBtn} onClick={waIndex + 1 >= waTotal ? handleWaFinish : handleWaDone}>
            {waIndex + 1 >= waTotal ? "Finish" : "Mark sent & next"} <ChevronRight size={14} />
          </button>

          {waSentCount > 0 && (
            <div className={d.remWaSummary}>
              <Check size={14} />
              <span>{waSentCount} house{waSentCount !== 1 ? "s" : ""} prompted</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (step === "wa_queue") {
    return (
      <div className={d.remModal} onClick={onClose}>
        <div className={d.remModalCard} onClick={(e) => e.stopPropagation()}>
          <button className={d.remModalClose} onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
          <div className={d.remDoneIcon}>
            <Check size={24} />
          </div>
          <div className={d.remDoneTitle}>WhatsApp reminders complete</div>
          <div className={d.remDoneDesc}>
            {waSentCount} of {waTotal} houses prompted via WhatsApp.
          </div>
          <div className={d.remModalActions}>
            <button className={d.remBtnPrimary} onClick={onClose}>Done</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={d.remModal} onClick={onClose}>
      <div className={d.remModalCard} onClick={(e) => e.stopPropagation()}>
        <button className={d.remModalClose} onClick={onClose} aria-label="Close">
          <X size={16} />
        </button>

        <div className={d.remModalIcon}>
          <Mail size={18} />
        </div>
        <div className={d.remModalTitle}>Send reminders</div>
        <div className={d.remModalDesc}>
          Choose a channel to remind {owingUnits.length} owing house{owingUnits.length !== 1 ? "s" : ""} to pay <strong>{collectionTitle}</strong>.
        </div>

        <div className={d.remChannelList}>
          <button
            className={`${d.remChannel} ${channel === "whatsapp" ? d.remChannelActive : ""}`}
            onClick={() => setChannel("whatsapp")}
            disabled={whatsappQueue.length === 0}
          >
            <div className={d.remChannelIcon}>
              <MessageCircle size={16} />
            </div>
            <div className={d.remChannelInfo}>
              <div className={d.remChannelName}>WhatsApp</div>
              <div className={d.remChannelCount}>
                {whatsappQueue.length > 0
                  ? `${whatsappQueue.length} of ${owingUnits.length} have a phone number${waSkipped > 0 ? ` · ${waSkipped} skipped` : ""}`
                  : `No owing houses with a phone number`}
              </div>
            </div>
            {channel === "whatsapp" && <Check size={16} className={d.remChannelCheck} />}
          </button>

          <button
            className={`${d.remChannel} ${channel === "email" ? d.remChannelActive : ""}`}
            onClick={() => setChannel("email")}
            disabled={emailQueue.length === 0}
          >
            <div className={d.remChannelIcon}>
              <Mail size={16} />
            </div>
            <div className={d.remChannelInfo}>
              <div className={d.remChannelName}>Email</div>
              <div className={d.remChannelCount}>
                {emailQueue.length > 0
                  ? `${emailQueue.length} of ${owingUnits.length} have an email${emailSkipped > 0 ? ` · ${emailSkipped} skipped` : ""}`
                  : `No owing houses with an email`}
              </div>
            </div>
            {channel === "email" && <Check size={16} className={d.remChannelCheck} />}
          </button>
        </div>

        <div className={d.remModalActions}>
          <button className={d.remBtnSecondary} onClick={onClose}>
            Cancel
          </button>
          {channel === "whatsapp" ? (
            <button
              className={d.remBtnPrimary}
              onClick={() => setStep("wa_queue")}
              disabled={whatsappQueue.length === 0 || sending}
            >
              Continue with WhatsApp · {whatsappQueue.length}
            </button>
          ) : (
            <button
              className={d.remBtnPrimary}
              onClick={handleSendEmail}
              disabled={emailQueue.length === 0 || sending}
            >
              {sending ? "Sending…" : `Send ${emailQueue.length} email${emailQueue.length !== 1 ? "s" : ""}`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
