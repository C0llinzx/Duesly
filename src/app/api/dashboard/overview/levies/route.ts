import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { estate: { include: { zones: true } } },
  })

  if (!user?.estate) return NextResponse.json({ error: "No estate" }, { status: 404 })

  const estate = user.estate

  const zoneIds = estate.zones.map((z) => z.id)

  const totalUnits = await prisma.unit.count({
    where: { zoneId: { in: zoneIds }, status: "active" },
  })

  const collections = await prisma.collection.findMany({
    where: { estateId: estate.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { payments: { where: { status: "success" } } },
      },
    },
  })

  return NextResponse.json(
    collections.map((c) => ({
      id: c.id,
      title: c.title,
      amountKobo: c.amountKobo,
      dueDate: c.dueDate,
      slug: c.slug,
      status: c.status,
      totalUnits,
      paidUnits: c._count.payments,
      owingUnits: totalUnits - c._count.payments,
    }))
  )
}
