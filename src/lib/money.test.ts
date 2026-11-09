import { describe, it, expect } from "vitest"
import { toKobo, toMajorUnits, formatNaira, formatCompactNaira } from "./money"

describe("kobo/naira conversion", () => {
  it("round-trips whole naira amounts", () => {
    expect(toKobo(15000)).toBe(1_500_000)
    expect(toMajorUnits(1_500_000)).toBe(15000)
  })

  it("rounds fractional kobo from toKobo (avoids float drift)", () => {
    // 15000.505 naira * 100 = 1500050.4999999998 in raw float math — must round, not truncate.
    expect(toKobo(15000.505)).toBe(1_500_051)
  })

  it("formats kobo as a whole-naira currency string with no decimals", () => {
    expect(formatNaira(1_500_000)).toBe("₦15,000")
    expect(formatNaira(0)).toBe("₦0")
    expect(formatNaira(50)).toBe("₦1") // 50 kobo rounds up to ₦1 for display
  })

  it("compacts large amounts for summary widgets", () => {
    expect(formatCompactNaira(100_000_000)).toBe("₦1m")
    expect(formatCompactNaira(150_000_000)).toBe("₦1.5m")
    expect(formatCompactNaira(1_500_000)).toBe("₦15k")
    expect(formatCompactNaira(50_000)).toBe("₦500")
  })
})
