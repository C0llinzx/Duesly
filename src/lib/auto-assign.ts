import { prisma } from "./db"

export async function autoAssignNewUnits(estateId: string, unitIds: string[]): Promise<{ levyTitle: string; count: number }[]> {
  if (unitIds.length === 0) return []

  const estate = await prisma.estate.findUnique({
    where: { id: estateId },
    include: { zones: { include: { units: { where: { status: "active" } } } } },
  })
  if (!estate) return []

  const allActiveUnitIds = new Set(estate.zones.flatMap((z) => z.units.map((u) => u.id)))

  // Fetch active collections (dueDate not yet passed, or no dueDate constraint — still open)
  const collections = await prisma.collection.findMany({
    where: {
      estateId,
      status: "active",
      dueDate: { gte: new Date() },
    },
    include: {
      assignments: true,
    },
  })

  if (collections.length === 0) return []

  const results: { levyTitle: string; count: number }[] = []

  for (const collection of collections) {
    const assignedIds = new Set(collection.assignments.map((a) => a.unitId))
    const assignedCount = assignedIds.size
    const totalActive = allActiveUnitIds.size

    // Heuristic to determine scope:
    // - If 80%+ of active houses are assigned → estate-wide
    // - If assigned houses cluster in specific zones → zone-scoped
    // - Otherwise → custom selection

    const isEstateWide = totalActive > 0 && (assignedCount / totalActive) >= 0.8

    if (isEstateWide) {
      // Estate-wide: assign all new units
      const toAssign = unitIds.filter((uid) => !assignedIds.has(uid) && allActiveUnitIds.has(uid))
      if (toAssign.length === 0) continue

      for (const unitId of toAssign) {
        await prisma.dueAssignment.upsert({
          where: { collectionId_unitId: { collectionId: collection.id, unitId } },
          update: { excluded: false },
          create: { collectionId: collection.id, unitId },
        })
      }
      results.push({ levyTitle: collection.title, count: toAssign.length })
    } else {
      // Zone-scoped or custom: check if the new unit's zone already has assignments
      const zoneIdsWithAssignments = new Set<string>()
      for (const a of collection.assignments) {
        const zone = estate.zones.find((z) => z.units.some((u) => u.id === a.unitId))
        if (zone) zoneIdsWithAssignments.add(zone.id)
      }

      const toAssign = unitIds.filter((uid) => {
        if (assignedIds.has(uid) || !allActiveUnitIds.has(uid)) return false
        // Find the zone of this unit
        const zone = estate.zones.find((z) => z.units.some((u) => u.id === uid))
        // Only assign if the zone already has assignments for this levy
        return zone && zoneIdsWithAssignments.has(zone.id)
      })

      if (toAssign.length === 0) continue

      for (const unitId of toAssign) {
        await prisma.dueAssignment.upsert({
          where: { collectionId_unitId: { collectionId: collection.id, unitId } },
          update: { excluded: false },
          create: { collectionId: collection.id, unitId },
        })
      }
      results.push({ levyTitle: collection.title, count: toAssign.length })
    }
  }

  return results
}
