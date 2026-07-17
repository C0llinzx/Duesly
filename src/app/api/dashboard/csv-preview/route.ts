import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { parseRosterCsv } from "@/lib/csv"

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { estate: { include: { zones: { include: { units: true } } } } },
    })
    if (!user?.estate) return NextResponse.json({ error: "No estate found" }, { status: 404 })

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

    const content = await file.text()
    const result = parseRosterCsv(content)

    // Build lookup: zone name → { zone, units map }
    const zoneLookup = new Map<string, { zone: typeof user.estate.zones[0]; units: Map<string, typeof user.estate.zones[0]["units"][0]> }>()
    for (const z of user.estate.zones) {
      const units = new Map(z.units.map((u) => [u.label.toLowerCase(), u]))
      zoneLookup.set(z.name.toLowerCase(), { zone: z, units })
    }

    // Classify each valid row
interface ClassifiedRow {
  zone: string
  unit: string
  address?: string
  residentName?: string
  phone1?: string
  phone2?: string
  email?: string
  change: "new" | "updated" | "unchanged"
  diff?: Record<string, { from: string; to: string }>
}

    const classified: ClassifiedRow[] = []

    for (const row of result.rows) {
      const za = zoneLookup.get(row.zone.toLowerCase())
      if (!za) {
        // Zone doesn't exist → row is new
        classified.push({ ...row, change: "new" })
        continue
      }

      const existing = za.units.get(row.unit.toLowerCase())
      if (!existing) {
        classified.push({ ...row, change: "new" })
        continue
      }

      // Existing unit — check each field for differences
      const diff: Record<string, { from: string; to: string }> = {}

      if ((row.residentName ?? "") !== (existing.residentName ?? "")) {
        diff.name = { from: existing.residentName ?? "—", to: row.residentName ?? "—" }
      }
      if ((row.phone1 ?? "") !== (existing.phone1 ?? "")) {
        diff.phone1 = { from: existing.phone1 ?? "—", to: row.phone1 ?? "—" }
      }
      if ((row.phone2 ?? "") !== (existing.phone2 ?? "")) {
        diff.phone2 = { from: existing.phone2 ?? "—", to: row.phone2 ?? "—" }
      }
      if ((row.email ?? "") !== (existing.residentEmail ?? "")) {
        diff.email = { from: existing.residentEmail ?? "—", to: row.email ?? "—" }
      }
      if ((row.address ?? "") !== (existing.address ?? "")) {
        diff.address = { from: existing.address ?? "—", to: row.address ?? "—" }
      }

      classified.push({
        ...row,
        change: Object.keys(diff).length > 0 ? "updated" : "unchanged",
        diff: Object.keys(diff).length > 0 ? diff : undefined,
      })
    }

    const newCount = classified.filter((r) => r.change === "new").length
    const updatedCount = classified.filter((r) => r.change === "updated").length
    const unchangedCount = classified.filter((r) => r.change === "unchanged").length

    // Detect potential renames: a zone where the file adds new house codes
    // without touching every existing house in that zone.
    const csvZoneNames = new Set(result.rows.map((r) => r.zone.toLowerCase()))
    const renameWarnings: string[] = []
    for (const [zoneName, za] of zoneLookup) {
      if (za.units.size === 0) continue
      if (!csvZoneNames.has(zoneName)) continue
      // Count how many of this zone's existing houses appear in the file
      const existingInCsv = result.rows.filter((r) => r.zone.toLowerCase() === zoneName)
      const matched = existingInCsv.filter((r) => za.units.has(r.unit.toLowerCase()))
      // The file adds new houses for this zone but doesn't touch all existing ones
      const csvHasNewForZone = existingInCsv.some((r) => !za.units.has(r.unit.toLowerCase()))
      if (csvHasNewForZone && matched.length < za.units.size) {
        renameWarnings.push(zoneName)
      }
    }

    return NextResponse.json({
      rows: classified,
      errors: result.errors,
      detectedDelimiter: result.detectedDelimiter,
      totalRows: classified.length + result.errors.length,
      validRows: classified.length,
      errorCount: result.errors.length,
      newCount,
      updatedCount,
      unchangedCount,
      note: "Houses already in your estate but not in this file will be left unchanged. Nothing is removed.",
      renameWarnings: renameWarnings.length > 0
        ? `Renaming a house? Edit it directly instead of re-importing — re-importing a changed code adds a new house rather than renaming the old one. (${renameWarnings.join(", ")})`
        : undefined,
    })
  } catch (error) {
    console.error("CSV preview error:", error)
    return NextResponse.json({ error: "Failed to parse CSV" }, { status: 500 })
  }
}
