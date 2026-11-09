import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { verifyAndRecordPayment } from "@/lib/payments/record"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const reference = searchParams.get("reference")

  if (!reference) {
    return NextResponse.json({ error: "Missing reference" }, { status: 400 })
  }

  const payment = await prisma.payment.findUnique({ where: { gatewayTxRef: reference } })

  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 })
  }

  // If already resolved, return immediately — this endpoint never records on its own authority,
  // it only triggers the same verify-and-record path the webhook uses (see payments/record.ts).
  if (payment.status === "success" || payment.status === "failed") {
    return NextResponse.json({ status: payment.status })
  }

  // Payment still pending — webhook may not have landed yet. Proactively verify with the
  // gateway through the shared recorder, so this path can never skip the amount check.
  const outcome = await verifyAndRecordPayment(reference, "status_poll")

  if (outcome === "success") return NextResponse.json({ status: "success" })
  if (outcome === "failed") return NextResponse.json({ status: "failed" })
  if (outcome === "amount_mismatch") {
    // Flag for review but do not tell the resident it failed — the charge may have gone
    // through on the gateway's side. The webhook/admin review resolves this, not this poll.
    return NextResponse.json({ status: "pending" })
  }

  return NextResponse.json({ status: "pending" })
}
