import { prisma } from "@/lib/db"

export interface EffectiveDue {
  amountKobo: number
  excluded: boolean
}

interface AssignmentLike {
  excluded: boolean
  amountKobo: number | null
}

/**
 * Applies a unit's DueAssignment override (custom amount and/or exclusion) on top of a
 * collection's default amount. This is the one place that decides "what does this unit
 * actually owe for this collection" — every reconciliation surface (dashboard, defaulters
 * export, reminders, public checkout) must go through this so they can't drift apart.
 */
export function resolveEffectiveDue(
  collectionAmountKobo: number,
  assignment: AssignmentLike | undefined | null,
): EffectiveDue {
  return {
    amountKobo: assignment?.amountKobo ?? collectionAmountKobo,
    excluded: assignment?.excluded ?? false,
  }
}

export async function getDueAssignmentMap(collectionId: string): Promise<Map<string, AssignmentLike>> {
  const assignments = await prisma.dueAssignment.findMany({ where: { collectionId } })
  return new Map(assignments.map((a) => [a.unitId, a]))
}
