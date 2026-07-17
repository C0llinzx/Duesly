import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { parseRosterCsv } from "@/lib/csv"
import { autoAssignNewUnits } from "@/lib/auto-assign"

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { estate: { include: { zones: true } } },
    })

    if (!user?.estate) return NextResponse.json({ error: "No estate found" }, { status: 404 })

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

    const content = await file.text()
    const result = parseRosterCsv(content)

    if (result.errors.length > 0) {
      return NextResponse.json({ error: "CSV has errors", errors: result.errors }, { status: 400 })
    }

    let inserted = 0
    let updated = 0
    const newUnitIds: string[] = []
    const zoneCache = new Map(user.estate.zones.map((z) => [z.name.toLowerCase(), z]))

    for (const row of result.rows) {
      // Find or create zone, keeping cache in sync
      let zone = zoneCache.get(row.zone.toLowerCase())

      if (!zone) {
        zone = await prisma.zone.create({
          data: { estateId: user.estate.id, name: row.zone },
        })
        zoneCache.set(row.zone.toLowerCase(), zone)
      }

      // Find existing unit
      const existing = await prisma.unit.findUnique({
        where: { zoneId_label: { zoneId: zone.id, label: row.unit } },
      })

      if (existing) {
        await prisma.unit.update({
          where: { id: existing.id },
          data: {
            address: row.address ?? existing.address,
            residentName: row.residentName ?? existing.residentName,
            phone1: row.phone1 ?? existing.phone1,
            phone2: row.phone2 ?? existing.phone2,
            residentEmail: row.email ?? existing.residentEmail,
          },
        })
        updated++
      } else {
        const unit = await prisma.unit.create({
          data: {
            zoneId: zone.id,
            label: row.unit,
            address: row.address,
            residentName: row.residentName,
            phone1: row.phone1,
            phone2: row.phone2,
            residentEmail: row.email,
          },
        })
        inserted++
        newUnitIds.push(unit.id)
      }
    }

    // Auto-assign newly created units to active levies
    const autoAssigned = await autoAssignNewUnits(user.estate.id, newUnitIds)

    return NextResponse.json({ ok: true, inserted, updated, autoAssigned })
  } catch (error: any) {
    console.error("CSV import error:", error)
    const message = error?.code === "P2002"
      ? "The file contains a duplicate Zone + House combination."
      : error?.message ?? "Something went wrong"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
