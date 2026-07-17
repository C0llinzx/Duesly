"use client"

import s from "@/components/shared.module.css"

export default function RecordPaymentButton({ collectionId: _collectionId }: { collectionId: string }) {
  return (
    <button className={s.btnTertiary}>
      Offline payment
    </button>
  )
}
