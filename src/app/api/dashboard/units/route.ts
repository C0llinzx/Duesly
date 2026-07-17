import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { unitSchema } from "@/lib/validation/units"
import { autoAssignNewUnits } from "@/lib/auto-assign"

export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        estate: {
          include: {
            zones: {
              include: { units: { orderBy: [{ status: "asc" }, { label: "asc" }] } },
              orderBy: { name: "asc" },
            },
          },
        },
      },
    })

    if (!user?.estate) return NextResponse.json({ error: "No estate found" }, { status: 404 })

    return NextResponse.json({ zones: user.estate.zones })
  } catch (error) {
    console.error("Units GET error:", error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const parsed = unitSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { estate: { include: { zones: true } } },
    })

    if (!user?.estate) return NextResponse.json({ error: "No estate found" }, { status: 404 })

    const zoneBelongsToEstate = user.estate.zones.some((z) => z.id === parsed.data.zoneId)
    if (!zoneBelongsToEstate) return NextResponse.json({ error: "Zone does not belong to your estate" }, { status: 403 })

    const unit = await prisma.unit.upsert({
      where: { zoneId_label: { zoneId: parsed.data.zoneId, label: parsed.data.label } },
      update: {
        address: parsed.data.address,
        residentName: parsed.data.residentName,
        phone1: parsed.data.phone1,
        phone2: parsed.data.phone2,
        residentEmail: parsed.data.residentEmail || null,
        occupancyType: parsed.data.occupancyType ?? "owner",
        status: parsed.data.status ?? "active",
      },
      create: {
        zoneId: parsed.data.zoneId,
        label: parsed.data.label,
        address: parsed.data.address,
        residentName: parsed.data.residentName,
        phone1: parsed.data.phone1,
        phone2: parsed.data.phone2,
        residentEmail: parsed.data.residentEmail || null,
        occupancyType: parsed.data.occupancyType ?? "owner",
        status: parsed.data.status ?? "active",
      },
    })

    // Auto-assign the new unit to active levies
    let autoAssigned: { levyTitle: string; count: number }[] = []
    if (unit.status === "active") {
      autoAssigned = await autoAssignNewUnits(user.estate.id, [unit.id])
    }

    return NextResponse.json({ ok: true, unit, autoAssigned })
  } catch (error) {
    console.error("Units POST error:", error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
