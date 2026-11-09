import { getEnv } from "../env"

// Paystack-specific settlement setup — subaccounts, bank resolution. Kept out of flow code
// per the payment flow spec: provider-specific calls live only in the adapter.

export interface Bank {
  name: string
  code: string
}

interface PaystackListResponse<T> {
  status: boolean
  message: string
  data: T
}

function authHeaders() {
  const env = getEnv()
  return {
    Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
    "Content-Type": "application/json",
  }
}

let bankCache: { fetchedAt: number; banks: Bank[] } | null = null
const BANK_CACHE_TTL_MS = 60 * 60 * 1000

export async function listNigerianBanks(): Promise<Bank[]> {
  if (bankCache && Date.now() - bankCache.fetchedAt < BANK_CACHE_TTL_MS) {
    return bankCache.banks
  }

  const res = await fetch("https://api.paystack.co/bank?country=nigeria&currency=NGN", {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error(`Paystack bank list failed: ${res.status}`)

  const json: PaystackListResponse<{ name: string; code: string }[]> = await res.json()
  if (!json.status) throw new Error(`Paystack bank list error: ${json.message}`)

  const banks = json.data.map((b) => ({ name: b.name, code: b.code }))
  bankCache = { fetchedAt: Date.now(), banks }
  return banks
}

export async function resolveBankAccount(accountNumber: string, bankCode: string): Promise<{ accountName: string }> {
  const res = await fetch(
    `https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`,
    { headers: authHeaders() },
  )
  const json: PaystackListResponse<{ account_name: string }> = await res.json()
  if (!res.ok || !json.status) {
    throw new Error(json.message ?? "Could not verify this account number")
  }
  return { accountName: json.data.account_name }
}

export async function createOrUpdateSubaccount(params: {
  existingSubaccountCode?: string | null
  businessName: string
  bankCode: string
  accountNumber: string
  percentageCharge: number
}): Promise<{ subaccountCode: string }> {
  const url = params.existingSubaccountCode
    ? `https://api.paystack.co/subaccount/${params.existingSubaccountCode}`
    : "https://api.paystack.co/subaccount"

  const res = await fetch(url, {
    method: params.existingSubaccountCode ? "PUT" : "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      business_name: params.businessName,
      settlement_bank: params.bankCode,
      account_number: params.accountNumber,
      percentage_charge: params.percentageCharge,
    }),
  })

  const json: PaystackListResponse<{ subaccount_code: string }> = await res.json()
  if (!res.ok || !json.status) {
    throw new Error(json.message ?? "Could not save payout details with Paystack")
  }

  return { subaccountCode: params.existingSubaccountCode ?? json.data.subaccount_code }
}
