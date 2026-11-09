import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { calculateFee, getFeeDisplay, maskEmail } from "./fees"

const ORIGINAL_ENV = { ...process.env }

function resetFeeEnv() {
  delete process.env.SERVICE_FEE_PERCENT
  delete process.env.SERVICE_FEE_FLAT_KOBO
}

beforeEach(resetFeeEnv)
afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

describe("calculateFee", () => {
  it("defaults to 1% when no fee env vars are set", () => {
    expect(calculateFee(1_500_000)).toBe(15_000) // 1% of ₦15,000
  })

  it("uses SERVICE_FEE_PERCENT when set", () => {
    process.env.SERVICE_FEE_PERCENT = "2.5"
    expect(calculateFee(1_000_000)).toBe(25_000) // 2.5% of ₦10,000
  })

  it("uses SERVICE_FEE_FLAT_KOBO when percent is not set", () => {
    process.env.SERVICE_FEE_FLAT_KOBO = "10000"
    expect(calculateFee(1_500_000)).toBe(10_000)
    // Flat fee doesn't scale with the amount.
    expect(calculateFee(10_000_000)).toBe(10_000)
  })

  it("prefers percent over flat when both are set", () => {
    process.env.SERVICE_FEE_PERCENT = "1"
    process.env.SERVICE_FEE_FLAT_KOBO = "10000"
    expect(calculateFee(1_500_000)).toBe(15_000)
  })

  it("rounds the fee to the nearest kobo", () => {
    process.env.SERVICE_FEE_PERCENT = "1"
    expect(calculateFee(333)).toBe(3) // 3.33 kobo → rounds to 3
  })
})

describe("getFeeDisplay", () => {
  it("describes a percent fee with the estate keeping the full levy", () => {
    const display = getFeeDisplay()
    expect(display.label).toBe("1%")
    expect(display.description).toContain("1% service fee")
    expect(display.description).toContain("full levy amount")
  })

  it("describes a flat fee in naira", () => {
    process.env.SERVICE_FEE_FLAT_KOBO = "10000"
    const display = getFeeDisplay()
    expect(display.label).toBe("₦100")
  })
})

describe("maskEmail", () => {
  it("masks all but the first two characters of a normal local part", () => {
    expect(maskEmail("collins@example.com")).toBe("co•••••@example.com")
  })

  it("masks a short local part down to one visible character", () => {
    expect(maskEmail("ab@example.com")).toBe("a•@example.com")
  })

  it("returns the input unchanged if there's no @ to split on", () => {
    expect(maskEmail("not-an-email")).toBe("not-an-email")
  })
})
