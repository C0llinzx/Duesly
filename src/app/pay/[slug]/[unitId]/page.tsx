import { prisma } from "@/lib/db"
import { calculateFee, getFeeDisplay, maskEmail } from "@/lib/fees"
import DirectPayFlow from "./DirectPayFlow"

export default async function DirectPayPage({ params }: { params: Promise<{ slug: string; unitId: string }> }) {
  const { slug, unitId } = await params

  const collection = await prisma.collection.findUnique({
    where: { slug },
    include: { estate: true },
  })

  if (!collection) {
    return (
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
        <h1 style={{ fontSize: 20, margin: "0 0 8px", color: "var(--text-primary)" }}>Due not found</h1>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
          This due link is invalid or may have expired. Please contact your estate administrator for a new link.
        </p>
      </div>
    )
  }

  if (collection.status !== "active") {
    return (
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h1 style={{ fontSize: 20, margin: "0 0 8px", color: "var(--text-primary)" }}>This due is closed</h1>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
          {collection.title} is no longer accepting payments. If you believe this is an error, please contact your estate administrator.
        </p>
      </div>
    )
  }

  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    select: { id: true, label: true, address: true, residentName: true, residentEmail: true, zoneId: true, status: true, occupancyType: true, zone: { select: { estateId: true } } },
  })

  if (!unit || unit.status !== "active" || unit.zone.estateId !== collection.estateId) {
    return (
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🏠</div>
        <h1 style={{ fontSize: 20, margin: "0 0 8px", color: "var(--text-primary)" }}>House not found</h1>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
          This house link is invalid. Please contact your estate administrator for the correct link.
        </p>
      </div>
    )
  }

  const payment = await prisma.payment.findUnique({
    where: { collectionId_unitId: { collectionId: collection.id, unitId: unit.id } },
  })
  const isPaid = payment?.status === "success"
  const feeKobo = calculateFee(collection.amountKobo)
  const feeDisplay = getFeeDisplay()
  const maskedEmail = unit.residentEmail ? maskEmail(unit.residentEmail) : null

  return (
    <DirectPayFlow
      collectionId={collection.id}
      unitId={unit.id}
      title={collection.title}
      amountKobo={collection.amountKobo}
      feeKobo={feeKobo}
      feeDisplay={feeDisplay}
      address={unit.address || unit.label}
      residentName={unit.residentName}
      maskedEmail={maskedEmail}
      isPaid={isPaid}
    />
  )
}
