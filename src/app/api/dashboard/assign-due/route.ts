import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      estate: {
        include: {
          collections: { where: { status: "active" }, orderBy: { createdAt: "desc" } },
          zones: { include: { units: { where: { status: "active" } } } },
        },
      },
    },
  })

  if (!user?.estate) return NextResponse.json({ error: "No estate" }, { status: 404 })

  const totalActiveHouses = user.estate.zones.reduce((s, z) => s + z.units.length, 0)

  return NextResponse.json({
    dues: user.estate.collections.map((c) => ({
      id: c.id,
      title: c.title,
      amountKobo: c.amountKobo,
      dueDate: c.dueDate,
    })),
    zones: user.estate.zones.map((z) => ({
      id: z.id,
      name: z.name,
      houseCount: z.units.length,
    })),
    totalActiveHouses,
  })
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { estate: true },
    })
    if (!user?.estate) return NextResponse.json({ error: "No estate" }, { status: 404 })

    const { collectionId, unitIds } = await request.json()
    if (!collectionId || !Array.isArray(unitIds) || unitIds.length === 0) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    const collection = await prisma.collection.findFirst({
      where: { id: collectionId, estateId: user.estate.id },
    })
    if (!collection) return NextResponse.json({ error: "Collection not found" }, { status: 404 })

    let count = 0
    for (const unitId of unitIds) {
      await prisma.dueAssignment.upsert({
        where: { collectionId_unitId: { collectionId, unitId } },
        update: { excluded: false },
        create: { collectionId, unitId },
      })
      count++
    }

    return NextResponse.json({ ok: true, applied: count })
  } catch (error) {
    console.error("Assign due error:", error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
