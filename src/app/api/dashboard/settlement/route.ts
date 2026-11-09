import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { resolveBankAccount, createOrUpdateSubaccount } from "@/lib/payments/paystack-subaccount"
import { getFeeDisplay } from "@/lib/fees"

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { id: session.userId }, include: { estate: true } })
  if (!user?.estate) return NextResponse.json({ error: "No estate" }, { status: 404 })

  const estate = user.estate
  return NextResponse.json({
    configured: !!estate.paystackSubaccountCode,
    bankName: estate.settlementBankName,
    accountNumber: estate.settlementAccountNumber
      ? `••••${estate.settlementAccountNumber.slice(-4)}`
      : null,
    accountName: estate.settlementAccountName,
  })
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { id: session.userId }, include: { estate: true } })
  if (!user?.estate) return NextResponse.json({ error: "No estate" }, { status: 404 })

  const body = await request.json()
  const { bankCode, bankName, accountNumber } = body

  if (!bankCode || !bankName || !accountNumber) {
    return NextResponse.json({ error: "Missing bank, bank name, or account number" }, { status: 400 })
  }
  if (!/^\d{10}$/.test(accountNumber)) {
    return NextResponse.json({ error: "Account number must be 10 digits" }, { status: 400 })
  }

  try {
    const resolved = await resolveBankAccount(accountNumber, bankCode)

    const { subaccountCode } = await createOrUpdateSubaccount({
      existingSubaccountCode: user.estate.paystackSubaccountCode,
      businessName: user.estate.name,
      bankCode,
      accountNumber,
      percentageCharge: parseFloat(getFeeDisplay().label.replace("%", "")) || 1,
    })

    await prisma.estate.update({
      where: { id: user.estate.id },
      data: {
        paystackSubaccountCode: subaccountCode,
        settlementBankCode: bankCode,
        settlementBankName: bankName,
        settlementAccountNumber: accountNumber,
        settlementAccountName: resolved.accountName,
      },
    })

    return NextResponse.json({ ok: true, accountName: resolved.accountName })
  } catch (err) {
    console.error("[settlement] setup failed", err)
    const message = err instanceof Error ? err.message : "Could not save payout details"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
