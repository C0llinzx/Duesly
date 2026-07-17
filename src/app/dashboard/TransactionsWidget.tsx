"use client"

import { CreditCard, Banknote, Copy, Check } from "lucide-react"
import { useState } from "react"
import { formatNaira } from "@/lib/money"
import d from "./mevolut.module.css"

interface Transaction {
  id: string
  amountKobo: number
  method: string
  paidAt: string
  unitLabel: string
  residentName: string | null
}

interface TransactionsWidgetProps {
  transactions: Transaction[]
  paymentLinkSlug: string | null
}

export default function TransactionsWidget({ transactions, paymentLinkSlug }: TransactionsWidgetProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!paymentLinkSlug) return
    const url = `${window.location.origin}/pay/${paymentLinkSlug}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (transactions.length === 0) {
    return (
      <div className={d.ovTxEmpty}>
        <span className={d.ovTxEmptyText}>No payments yet — share your payment link to start collecting</span>
        {paymentLinkSlug && (
          <button className={d.ovTxCopyBtn} onClick={handleCopy}>
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? "Copied" : "Copy payment link"}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className={d.ovTxList}>
      {transactions.map((tx) => (
        <div key={tx.id} className={d.ovTxRow}>
          <div className={d.ovTxLeft}>
            <span className={d.ovTxUnit}>{tx.unitLabel}</span>
            {tx.residentName && <span className={d.ovTxName}> · {tx.residentName}</span>}
          </div>
          <div className={d.ovTxRight}>
            <span className={d.ovTxAmount}>{formatNaira(tx.amountKobo)}</span>
            {tx.method === "online" ? (
              <span className={`${d.ovTxPill} ${d.ovTxPillOnline}`}>
                <CreditCard size={10} />
                online
              </span>
            ) : (
              <span className={`${d.ovTxPill} ${d.ovTxPillOffline}`}>
                <Banknote size={10} />
                offline
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
