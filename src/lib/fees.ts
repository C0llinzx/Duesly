import { formatNaira } from "./money"

export function maskEmail(email: string): string {
  const at = email.indexOf("@")
  if (at <= 0) return email
  const local = email.slice(0, at)
  const domain = email.slice(at)
  const visible = local.length <= 2 ? 1 : 2
  const masked = local.slice(0, visible) + "\u2022".repeat(Math.max(1, local.length - visible))
  return masked + domain
}

type FeeConfig =
  | { type: "percent"; value: number }
  | { type: "flat"; valueKobo: number }

function getFeeConfig(): FeeConfig {
  const percent = process.env.SERVICE_FEE_PERCENT
  const flat = process.env.SERVICE_FEE_FLAT_KOBO

  if (percent) return { type: "percent", value: parseFloat(percent) }
  if (flat) return { type: "flat", valueKobo: parseInt(flat, 10) }
  return { type: "percent", value: 1 }
}

export function calculateFee(amountKobo: number): number {
  const config = getFeeConfig()
  if (config.type === "percent") {
    return Math.round(amountKobo * config.value / 100)
  }
  return config.valueKobo
}

export function getFeeDisplay(): { label: string; description: string } {
  const config = getFeeConfig()
  if (config.type === "percent") {
    return {
      label: `${config.value}%`,
      description: `Residents pay a ${config.value}% service fee on each online payment. Your estate receives the full levy amount.`,
    }
  }
  const naira = formatNaira(config.valueKobo)
  return {
    label: naira,
    description: `Residents pay a ${naira} service fee on each online payment. Your estate receives the full levy amount.`,
  }
}
