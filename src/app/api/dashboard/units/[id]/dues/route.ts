import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { resolveEffectiveDue } from "@/lib/dues"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const unit = await prisma.unit.findUnique({
    where: { id },
    include: { zone: { include: { estate: true } } },
  })
  if (!unit) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (unit.zone.estate.adminId !== session.userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const collections = await prisma.collection.findMany({
    where: { estateId: unit.zone.estateId, status: "active" },
    orderBy: { createdAt: "desc" },
  })

  const assignments = await prisma.dueAssignment.findMany({ where: { unitId: id } })
  const assignmentMap = new Map(assignments.map((a) => [a.collectionId, a]))

  const payments = await prisma.payment.findMany({ where: { unitId: id } })
  const paymentMap = new Map(payments.map((p) => [p.collectionId, p]))

  const dues = collections.map((c) => {
    const assignment = assignmentMap.get(c.id)
    const payment = paymentMap.get(c.id)
    const isExcluded = assignment?.excluded ?? false
    const isException = assignment?.amountKobo !== null && assignment?.amountKobo !== undefined

    const status = isExcluded ? "excluded"
      : payment?.status === "success" ? "paid"
      : "owing"

    return {
      collectionId: c.id,
      title: c.title,
      amountKobo: assignment?.amountKobo ?? c.amountKobo,
      defaultAmountKobo: c.amountKobo,
      isException,
      isExcluded,
      status,
      method: payment?.method ?? null,
      paidAt: payment?.paidAt ?? null,
      slug: c.slug,
    }
  })

  return NextResponse.json({
    unit: {
      id: unit.id,
      label: unit.label,
      address: unit.address,
      residentName: unit.residentName,
      phone1: unit.phone1,
      phone2: unit.phone2,
      residentEmail: unit.residentEmail,
      status: unit.status,
      zoneName: unit.zone.name,
    },
    dues,
  })
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const { action, collectionId, amountKobo } = body

  const unit = await prisma.unit.findUnique({
    where: { id },
    include: { zone: { include: { estate: true } } },
  })
  if (!unit) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (unit.zone.estate.adminId !== session.userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  // Verify collection belongs to this estate
  const collection = await prisma.collection.findFirst({
    where: { id: collectionId, estateId: unit.zone.estateId },
  })
  if (!collection) return NextResponse.json({ error: "Collection not found" }, { status: 404 })

  if (action === "mark-paid") {
    const assignment = await prisma.dueAssignment.findUnique({
      where: { collectionId_unitId: { collectionId, unitId: id } },
    })
    const due = resolveEffectiveDue(collection.amountKobo, assignment)
    if (due.excluded) {
      return NextResponse.json({ error: "This unit is excluded from this due" }, { status: 400 })
    }

    await prisma.payment.create({
      data: {
        collectionId,
        unitId: id,
        amountKobo: amountKobo ?? due.amountKobo,
        method: "manual",
        status: "success",
        paidAt: new Date(),
      },
    })
    return NextResponse.json({ ok: true })
  }

  if (action === "exclude") {
    await prisma.dueAssignment.upsert({
      where: { collectionId_unitId: { collectionId, unitId: id } },
      update: { excluded: true },
      create: { collectionId, unitId: id, excluded: true },
    })
    return NextResponse.json({ ok: true })
  }

  if (action === "assign") {
    // amountKobo is an optional custom override for this unit's due; omit it to just
    // (re-)include the unit at the collection's default amount.
    const customAmount = typeof amountKobo === "number" ? amountKobo : null
    await prisma.dueAssignment.upsert({
      where: { collectionId_unitId: { collectionId, unitId: id } },
      update: { excluded: false, amountKobo: customAmount },
      create: { collectionId, unitId: id, amountKobo: customAmount },
    })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}
