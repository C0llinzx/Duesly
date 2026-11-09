import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { maskEmail, calculateFee } from "@/lib/fees"
import { resolveEffectiveDue } from "@/lib/dues"

// Reveals one unit's confirmation details (name + masked email) only after the resident has
// already picked that specific unit from the address list. Never returns a roster — the pay
// page's initial load must not ship every unit's resident name/email to the browser
// (payment-flow-spec invariant #7: no directory, no third-party name/email).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const collectionId = searchParams.get("collectionId")
  const unitId = searchParams.get("unitId")

  if (!collectionId || !unitId) {
    return NextResponse.json({ error: "Missing collectionId or unitId" }, { status: 400 })
  }

  const collection = await prisma.collection.findUnique({
    where: { id: collectionId },
    select: { estateId: true, amountKobo: true },
  })

  if (!collection) {
    return NextResponse.json({ error: "Collection not found" }, { status: 404 })
  }

  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    select: {
      residentName: true,
      residentEmail: true,
      status: true,
      zone: { select: { estateId: true } },
    },
  })

  if (!unit || unit.status !== "active" || unit.zone.estateId !== collection.estateId) {
    return NextResponse.json({ error: "Unit not found" }, { status: 404 })
  }

  const [payment, assignment] = await Promise.all([
    prisma.payment.findUnique({
      where: { collectionId_unitId: { collectionId, unitId } },
      select: { status: true },
    }),
    prisma.dueAssignment.findUnique({
      where: { collectionId_unitId: { collectionId, unitId } },
    }),
  ])

  const due = resolveEffectiveDue(collection.amountKobo, assignment)

  if (due.excluded) {
    return NextResponse.json({ error: "This house is not due for this collection" }, { status: 404 })
  }

  const feeKobo = calculateFee(due.amountKobo)

  return NextResponse.json({
    residentName: unit.residentName,
    maskedEmail: unit.residentEmail ? maskEmail(unit.residentEmail) : null,
    isPaid: payment?.status === "success",
    amountKobo: due.amountKobo,
    feeKobo,
  })
}
