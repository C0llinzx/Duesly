import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getDueAssignmentMap, resolveEffectiveDue } from "@/lib/dues"

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { estate: { include: { zones: { include: { units: { where: { status: "active" }, orderBy: { label: "asc" } } }, orderBy: { name: "asc" } }, collections: { where: { status: "active" }, orderBy: { createdAt: "desc" }, take: 1 } } } },
  })

  if (!user?.estate) return NextResponse.json({ error: "No estate" }, { status: 404 })

  const estate = user.estate
  const activeCollection = estate.collections[0] ?? null

  // Get payment status for each unit
  const unitPayments: Map<string, { paid: boolean; paidAt: Date | null; amountKobo: number }> = new Map()
  const payments: { unitId: string; paidAt: Date | null; amountKobo: number }[] = []
  const assignmentMap: Map<string, { excluded: boolean; amountKobo: number | null }> = activeCollection
    ? await getDueAssignmentMap(activeCollection.id)
    : new Map()
  if (activeCollection) {
    const rows = await prisma.payment.findMany({
      where: { collectionId: activeCollection.id, status: "success" },
      select: { unitId: true, paidAt: true, amountKobo: true },
      orderBy: { paidAt: "asc" },
    })
    for (const p of rows) {
      unitPayments.set(p.unitId, { paid: true, paidAt: p.paidAt, amountKobo: p.amountKobo })
      payments.push(p)
    }
  }

  // Fetch recent payments for the transactions widget
  const estateZoneIds = estate.zones.map((z) => z.id)
  const recentPayments = await prisma.payment.findMany({
    where: { unit: { zoneId: { in: estateZoneIds } }, status: "success", paidAt: { not: null } },
    orderBy: { paidAt: "desc" },
    take: 5,
    include: { unit: true },
  })

  // Build zones with units and payment status — units excluded from the active collection
  // (DueAssignment.excluded) don't count toward this collection's totals or owing list.
  let totalUnits = 0
  let totalPaid = 0
  let totalCollected = 0

  const dashboardZones = estate.zones.map((zone) => {
    const zoneUnits = zone.units
      .map((unit) => {
        const due = activeCollection ? resolveEffectiveDue(activeCollection.amountKobo, assignmentMap.get(unit.id)) : { amountKobo: 0, excluded: false }
        const payment = unitPayments.get(unit.id)
        const paid = payment?.paid ?? false
        return {
          id: unit.id,
          label: unit.label,
          address: unit.address,
          residentName: unit.residentName,
          phone1: unit.phone1,
          paid,
          paidAt: payment?.paidAt ?? null,
          amountKobo: due.amountKobo,
          excluded: due.excluded,
        }
      })
      .filter((u) => !u.excluded)

    for (const u of zoneUnits) {
      totalUnits++
      if (u.paid) {
        totalPaid++
        totalCollected += unitPayments.get(u.id)?.amountKobo ?? u.amountKobo
      }
    }

    const zonePaid = zoneUnits.filter((u) => u.paid).length
    return {
      id: zone.id,
      name: zone.name,
      units: zoneUnits,
      paid: zonePaid,
      total: zoneUnits.length,
    }
  })

  return NextResponse.json({
    userName: user.name ?? "Treasurer",
    estateName: estate.name,
    collection: activeCollection
      ? {
          id: activeCollection.id,
          title: activeCollection.title,
          amountKobo: activeCollection.amountKobo,
          dueDate: activeCollection.dueDate,
          slug: activeCollection.slug,
          createdAt: activeCollection.createdAt.toISOString(),
        }
      : null,
    paymentHistory: payments
      .filter((p) => p.paidAt)
      .map((p) => ({ date: p.paidAt!.toISOString(), amountKobo: p.amountKobo })),
    recentPayments: recentPayments.map((p) => ({
      id: p.id,
      amountKobo: p.amountKobo,
      method: p.method,
      paidAt: p.paidAt!.toISOString(),
      unitLabel: p.unit.label,
      residentName: p.unit.residentName,
    })),
    zones: dashboardZones,
    totalUnits,
    totalPaid,
    totalOwing: totalUnits - totalPaid,
    totalCollected,
  })
}
