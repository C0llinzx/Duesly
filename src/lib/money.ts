export function toMajorUnits(kobo: number): number {
  return kobo / 100
}

export function toKobo(naira: number): number {
  return Math.round(naira * 100)
}

export function formatNaira(kobo: number): string {
  const naira = Math.round(toMajorUnits(kobo))
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(naira)
}

export function formatCompactNaira(kobo: number): string {
  const naira = Math.round(toMajorUnits(kobo))
  if (naira >= 1_000_000) {
    const m = naira / 1_000_000
    return `₦${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}m`
  }
  if (naira >= 1_000) {
    const k = naira / 1_000
    return `₦${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`
  }
  return `₦${naira}`
}
