import { prisma } from "@/lib/db"
import { calculateFee, getFeeDisplay, maskEmail } from "@/lib/fees"
import PayFlow from "./PayFlow"

export default async function PayPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const collection = await prisma.collection.findUnique({
    where: { slug },
    include: {
      estate: {
        include: {
          zones: {
            include: {
              units: {
                where: { status: "active" },
                select: { id: true, label: true, address: true, residentName: true, residentEmail: true, zoneId: true },
                orderBy: { label: "asc" },
              },
            },
            orderBy: { name: "asc" },
          },
        },
      },
      payments: {
        where: { status: "success" },
        select: { unitId: true },
      },
    },
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

  const paidUnitIds = new Set(collection.payments.map((p) => p.unitId))

  const zones = collection.estate?.zones.map((zone) => ({
    id: zone.id,
    name: zone.name,
    units: zone.units.map((unit) => ({
      id: unit.id,
      label: unit.label,
      address: unit.address,
      residentName: unit.residentName,
      maskedEmail: unit.residentEmail ? maskEmail(unit.residentEmail) : null,
      isPaid: paidUnitIds.has(unit.id),
    })),
  }))

  const feeKobo = calculateFee(collection.amountKobo)
  const feeDisplay = getFeeDisplay()

  return (
    <PayFlow
      zones={zones}
      collectionId={collection.id}
      amountKobo={collection.amountKobo}
      feeKobo={feeKobo}
      feeDisplay={feeDisplay}
      estateName={collection.estate.name}
      collectionTitle={collection.title}
    />
  )
}
