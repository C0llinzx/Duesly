"use client"

import { useState } from "react"
import { Bell } from "lucide-react"
import RecordPaymentButton from "./RecordPaymentButton"
import SendRemindersModal from "./SendRemindersModal"
import { useToast } from "@/components/ToastProvider"
import s from "@/components/shared.module.css"
import d from "../../mevolut.module.css"

interface OweUnit {
  id: string
  label: string
  residentName: string | null
  phone1: string | null
  residentEmail: string | null
}

interface Props {
  collectionId: string
  collectionTitle: string
  estateName: string
  amount: string
  dueDate: string
  paymentLink: string
  owingUnits: OweUnit[]
}

export default function DetailActions({
  collectionId,
  collectionTitle,
  estateName,
  amount,
  dueDate,
  paymentLink,
  owingUnits,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false)
  const { success, error } = useToast()

  const hasOwing = owingUnits.length > 0

  return (
    <>
      <div className={d.detailHeroActions}>
        <button
          className={`${s.btnPrimary} ${d.detailSendReminderBtn}`}
          onClick={() => setModalOpen(true)}
          disabled={!hasOwing}
          title={!hasOwing ? "All houses have paid" : undefined}
        >
          <Bell size={14} />
          Send reminders
        </button>
        <RecordPaymentButton collectionId={collectionId} />
      </div>

      <SendRemindersModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onToast={(msg) => success(msg)}
        collectionId={collectionId}
        collectionTitle={collectionTitle}
        estateName={estateName}
        amount={amount}
        dueDate={dueDate}
        paymentLink={paymentLink}
        owingUnits={owingUnits}
      />
    </>
  )
}
