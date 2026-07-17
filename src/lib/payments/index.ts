import type { PaymentGateway } from "./gateway"
import { paystackGateway, verifyWebhookSignature as verifyPaystack } from "./paystack"
import { getEnv } from "../env"

let _gateway: PaymentGateway | null = null

export function getPaymentGateway(): PaymentGateway {
  if (_gateway) return _gateway

  const provider = getEnv().PAYMENT_GATEWAY

  switch (provider) {
    case "paystack":
      _gateway = paystackGateway
      break
    default:
      throw new Error(`Unknown payment gateway: ${provider}`)
  }

  return _gateway
}

export function verifyWebhookSignature(signature: string, body: string): boolean {
  const provider = getEnv().PAYMENT_GATEWAY

  switch (provider) {
    case "paystack":
      return verifyPaystack(signature, body)
    default:
      return false
  }
}
