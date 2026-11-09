"use client"

import { useState } from "react"
import RecordPaymentModal from "./RecordPaymentModal"
import s from "@/components/shared.module.css"

interface OweUnit {
  id: string
  label: string
  residentName: string | null
}

interface Props {
  collectionId: string
  owingUnits: OweUnit[]
  onToast: (msg: string) => void
}

export default function RecordPaymentButton({ collectionId, owingUnits, onToast }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button className={s.btnTertiary} onClick={() => setOpen(true)}>
        Offline payment
      </button>
      <RecordPaymentModal
        open={open}
        onClose={() => setOpen(false)}
        onToast={onToast}
        collectionId={collectionId}
        owingUnits={owingUnits}
      />
    </>
  )
}
