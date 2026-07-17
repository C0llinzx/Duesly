import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params

    const collection = await prisma.collection.findUnique({
      where: { id },
      include: {
        estate: { include: { zones: { include: { units: { where: { status: "active" } } } } } },
        payments: { where: { status: "success" }, select: { unitId: true } },
      },
    })

    if (!collection) return NextResponse.json({ error: "Collection not found" }, { status: 404 })

    const user = await prisma.user.findUnique({ where: { id: session.userId } })
    if (!user || user.id !== collection.estate.adminId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const paidUnitIds = new Set(collection.payments.map((p) => p.unitId))

    const rows: string[][] = [["Zone", "Unit", "Resident Name", "Phone 1", "Phone 2", "Email", "Occupancy"]]

    for (const zone of collection.estate.zones) {
      for (const unit of zone.units) {
        if (!paidUnitIds.has(unit.id)) {
          rows.push([
            zone.name,
            unit.label,
            unit.residentName ?? "",
            unit.phone1 ?? "",
            unit.phone2 ?? "",
            unit.residentEmail ?? "",
            unit.occupancyType ?? "",
          ])
        }
      }
    }

    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n")
    const filename = `defaulters-${collection.slug}.csv`

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("Defaulters export error:", error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
