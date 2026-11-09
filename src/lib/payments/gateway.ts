export interface InitPaymentParams {
  email: string
  amountKobo: number
  reference: string
  callbackUrl: string
  metadata: Record<string, string>
  /**
   * Settlement split (optional — omitted until the estate has configured a payout
   * subaccount). When present, the gateway splits the charge so `amountKobo` minus
   * `transactionChargeKobo` settles to the estate's own account instead of pooling
   * in Duesly's. `bearer: "main"` means Duesly's account absorbs the gateway's own
   * processing fee, not the estate's subaccount.
   */
  split?: {
    subaccountCode: string
    transactionChargeKobo: number
    bearer: "main" | "subaccount"
  }
}

export interface VerifyPaymentResult {
  status: "success" | "failed" | "pending"
  amount: number
  currency: string
  gatewayRef: string
  gatewayId: string
  paidAt: string | null
}

export interface WebhookEvent {
  type: "success" | "failed" | "ignored"
  reference: string | null
}

export interface PaymentGateway {
  initPayment(params: InitPaymentParams): Promise<{ authorizationUrl: string; accessCode: string }>
  verifyPayment(reference: string): Promise<VerifyPaymentResult>
  verifyWebhookSignature(rawBody: string, headers: Headers): boolean
  parseWebhookEvent(rawBody: string): WebhookEvent
}
