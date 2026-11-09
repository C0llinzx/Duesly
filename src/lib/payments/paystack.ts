import { createHmac, timingSafeEqual } from "crypto"
import type { InitPaymentParams, VerifyPaymentResult, PaymentGateway, WebhookEvent } from "./gateway"
import { getEnv } from "../env"

interface PaystackInitResponse {
  status: boolean
  message: string
  data: {
    authorization_url: string
    access_code: string
    reference: string
  }
}

interface PaystackVerifyResponse {
  status: boolean
  message: string
  data: {
    status: string
    reference: string
    amount: number
    currency: string
    gateway_response: string
    paid_at: string | null
    id: number
  }
}

export const paystackGateway: PaymentGateway = {
  async initPayment({ email, amountKobo, reference, callbackUrl, metadata }: InitPaymentParams) {
    const env = getEnv()
    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: amountKobo,
        reference,
        callback_url: callbackUrl,
        metadata,
      }),
    })

    if (!res.ok) {
      throw new Error(`Paystack init failed: ${res.status}`)
    }

    const json: PaystackInitResponse = await res.json()

    if (!json.status) {
      throw new Error(`Paystack init error: ${json.message}`)
    }

    return {
      authorizationUrl: json.data.authorization_url,
      accessCode: json.data.access_code,
    }
  },

  async verifyPayment(reference: string): Promise<VerifyPaymentResult> {
    const env = getEnv()
    const res = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
      },
    })

    if (!res.ok) {
      throw new Error(`Paystack verify failed: ${res.status}`)
    }

    const json: PaystackVerifyResponse = await res.json()

    if (!json.status) {
      throw new Error(`Paystack verify error: ${json.message}`)
    }

    return {
      status: json.data.status === "success" ? "success" : json.data.status === "failed" ? "failed" : "pending",
      amount: json.data.amount,
      currency: json.data.currency,
      gatewayRef: json.data.reference,
      gatewayId: String(json.data.id),
      paidAt: json.data.paid_at,
    }
  },

  verifyWebhookSignature(rawBody: string, headers: Headers): boolean {
    const env = getEnv()
    const signature = headers.get("x-paystack-signature") ?? ""
    const hash = createHmac("sha512", env.PAYSTACK_SECRET_KEY!)
      .update(rawBody)
      .digest("hex")

    try {
      return timingSafeEqual(Buffer.from(hash), Buffer.from(signature))
    } catch {
      return false
    }
  },

  parseWebhookEvent(rawBody: string): WebhookEvent {
    let event: { event?: string; data?: { reference?: string } }
    try {
      event = JSON.parse(rawBody)
    } catch {
      return { type: "ignored", reference: null }
    }

    const reference = event.data?.reference ?? null

    if (event.event === "charge.success") return { type: "success", reference }
    if (event.event === "charge.failed") return { type: "failed", reference }
    return { type: "ignored", reference }
  },
}
