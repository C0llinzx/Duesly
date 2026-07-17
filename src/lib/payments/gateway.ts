export interface InitPaymentParams {
  email: string
  amountKobo: number
  reference: string
  callbackUrl: string
  metadata: Record<string, string>
}

export interface VerifyPaymentResult {
  status: "success" | "failed" | "pending"
  amount: number
  currency: string
  gatewayRef: string
  gatewayId: string
  paidAt: string | null
}

export interface PaymentGateway {
  initPayment(params: InitPaymentParams): Promise<{ authorizationUrl: string; accessCode: string }>
  verifyPayment(reference: string): Promise<VerifyPaymentResult>
}
