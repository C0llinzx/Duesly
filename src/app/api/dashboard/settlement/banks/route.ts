import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { listNigerianBanks } from "@/lib/payments/paystack-subaccount"

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const banks = await listNigerianBanks()
    return NextResponse.json({ banks })
  } catch (err) {
    console.error("[settlement] bank list failed", err)
    return NextResponse.json({ error: "Could not load bank list" }, { status: 502 })
  }
}
