import { prisma } from "@/lib/db"
import ReceiptFlow from "../ReceiptFlow"

export default async function ReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ reference?: string | string[] }>
}) {
  const { slug } = await params
  const { reference: raw } = await searchParams
  const reference = Array.isArray(raw) ? raw[0] : raw

  if (!reference) {
    return (
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
        <h1 style={{ fontSize: 20, margin: "0 0 8px", color: "var(--text-primary)" }}>No reference found</h1>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
          This receipt link is missing a payment reference. Please check your payment confirmation.
        </p>
      </div>
    )
  }

  const payment = await prisma.payment.findUnique({
    where: { gatewayTxRef: reference },
    include: {
      collection: { include: { estate: true } },
      unit: { include: { zone: true } },
    },
  })

  if (!payment) {
    return (
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
        <h1 style={{ fontSize: 20, margin: "0 0 8px", color: "var(--text-primary)" }}>Payment not found</h1>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
          We couldn&apos;t find a payment with this reference. If you were debited, please wait a few minutes and try again, or contact your estate administrator.
        </p>
      </div>
    )
  }

  return (
    <ReceiptFlow
      initial={{
        status: payment.status,
        amountKobo: payment.amountKobo,
        feeKobo: payment.feeKobo,
        estateName: payment.collection.estate.name,
        collectionTitle: payment.collection.title,
        collectionSlug: slug,
        zoneName: payment.unit.zone.name,
        unitLabel: payment.unit.label,
        residentName: payment.unit.residentName,
        reference,
      }}
    />
  )
}
