import { describe, it, expect } from "vitest"
import { resolveEffectiveDue } from "./dues"

describe("resolveEffectiveDue", () => {
  it("falls back to the collection's default amount with no assignment", () => {
    const due = resolveEffectiveDue(1_500_000, undefined)
    expect(due).toEqual({ amountKobo: 1_500_000, excluded: false })
  })

  it("falls back to the default amount when the assignment has no override", () => {
    const due = resolveEffectiveDue(1_500_000, { excluded: false, amountKobo: null })
    expect(due).toEqual({ amountKobo: 1_500_000, excluded: false })
  })

  it("uses the assignment's custom amount when set", () => {
    const due = resolveEffectiveDue(1_500_000, { excluded: false, amountKobo: 500_000 })
    expect(due).toEqual({ amountKobo: 500_000, excluded: false })
  })

  it("marks the unit excluded regardless of amount", () => {
    const due = resolveEffectiveDue(1_500_000, { excluded: true, amountKobo: null })
    expect(due.excluded).toBe(true)
  })

  it("an excluded unit with a custom amount is still excluded (exclusion wins)", () => {
    const due = resolveEffectiveDue(1_500_000, { excluded: true, amountKobo: 500_000 })
    expect(due).toEqual({ amountKobo: 500_000, excluded: true })
  })
})
