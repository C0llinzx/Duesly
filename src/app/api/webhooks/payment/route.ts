import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getPaymentGateway, verifyWebhookSignature } from "@/lib/payments"
import { formatNaira } from "@/lib/money"
import { sendEmail, paymentReceiptHtml, paymentAlertHtml, paymentFailedHtml } from "@/lib/email"
import { getEnv } from "@/lib/env"

export const runtime = "nodejs"

import { Prisma } from "@prisma/client"

async function safeLog(paymentId: string, event: string, metadata: Record<string, unknown>) {
  try {
    await prisma.paymentLog.create({ data: { paymentId, event, metadata: metadata as Prisma.InputJsonValue } })
  } catch (err) {
    console.error("[webhook] paymentLog.create failed", { paymentId, event, err })
  }
}

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get("x-paystack-signature") ?? ""

  if (!verifyWebhookSignature(signature, body)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  let event: { event?: string; data?: { reference?: string } }
  try {
    event = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: "Malformed payload" }, { status: 400 })
  }

  const reference = event.data?.reference
  if (!reference) return NextResponse.json({ status: "ignored" }, { status: 200 })

  if (event.event !== "charge.success" && event.event !== "charge.failed") {
    return NextResponse.json({ status: "ignored" }, { status: 200 })
  }

  const payment = await prisma.payment.findUnique({
    where: { gatewayTxRef: reference },
    include: {
      collection: { include: { estate: { include: { admin: true } } } },
      unit: { include: { zone: true } },
    },
  })

  if (!payment) {
    console.error("[webhook] payment not found for reference", reference)
    return NextResponse.json({ status: "ignored" }, { status: 200 })
  }

  if (payment.status === "success") {
    return NextResponse.json({ status: "already_processed" }, { status: 200 })
  }

  // ── charge.failed ──
  if (event.event === "charge.failed") {
    if (payment.status !== "success") {
      try {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: "failed" },
        })
      } catch (err) {
        console.error("[webhook] payment update (failed) error", { reference, err })
        return NextResponse.json({ status: "db_error" }, { status: 500 })
      }

      await safeLog(payment.id, "webhook_charge_failed", { reference })
      void sendFailedEmails(payment)
    }
    return NextResponse.json({ status: "logged" }, { status: 200 })
  }

  // ── charge.success: server-side verify ──
  const gateway = getPaymentGateway()
  let verified
  try {
    verified = await gateway.verifyPayment(reference)
  } catch (err) {
    console.error("[webhook] gateway verify failed", { reference, err })
    return NextResponse.json({ status: "verify_failed" }, { status: 200 })
  }

  if (verified.status !== "success") {
    console.error("[webhook] verify returned non-success", { reference, status: verified.status })
    return NextResponse.json({ status: "not_success" }, { status: 200 })
  }

  // ── Amount mismatch ──
  if (verified.amount !== payment.amountKobo + payment.feeKobo) {
    console.error("[webhook] amount mismatch", {
      reference,
      expected: payment.amountKobo + payment.feeKobo,
      expectedDue: payment.amountKobo,
      expectedFee: payment.feeKobo,
      received: verified.amount,
    })
    await safeLog(payment.id, "webhook_amount_mismatch", {
      reference,
      expected: payment.amountKobo + payment.feeKobo,
      expectedDue: payment.amountKobo,
      expectedFee: payment.feeKobo,
      received: verified.amount,
    })
    // Paystack confirmed the charge succeeded — record it as success so it doesn't stay in limbo.
    // The mismatch is logged for admin review.
  }

  // ── Mark success ──
  try {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "success",
        gatewayTxId: verified.gatewayId,
        paidAt: verified.paidAt ? new Date(verified.paidAt) : new Date(),
      },
    })
  } catch (err) {
    console.error("[webhook] payment update (success) error", { reference, err })
    return NextResponse.json({ status: "db_error" }, { status: 500 })
  }

  await safeLog(payment.id, "webhook_verified", {
    reference,
    amountKobo: verified.amount,
    feeKobo: payment.feeKobo,
    gatewayId: verified.gatewayId,
    paidAt: verified.paidAt,
  })

  void sendSuccessEmails(payment, reference)

  return NextResponse.json({ status: "success" }, { status: 200 })
}

async function sendSuccessEmails(
  payment: {
    amountKobo: number
    feeKobo: number
    collection: {
      title: string
      estate: { name: string; admin: { email: string } | null }
    }
    unit: {
      label: string
      zone: { name: string }
      residentEmail: string | null
      residentName: string | null
    }
  },
  reference: string,
) {
  const { collection, unit } = payment
  const estate = collection.estate
  const env = getEnv()
  const tasks: Promise<void>[] = []

  // Receipt to resident
  if (unit.residentEmail) {
    tasks.push(
      sendEmail({
        to: unit.residentEmail,
        subject: `Payment Confirmed - ${collection.title}`,
        html: paymentReceiptHtml({
          estateName: estate.name,
          collectionTitle: collection.title,
          levyAmount: formatNaira(payment.amountKobo),
          feeAmount: formatNaira(payment.feeKobo),
          totalAmount: formatNaira(payment.amountKobo + payment.feeKobo),
          unitLabel: unit.label,
          zoneName: unit.zone.name,
          paidAt: new Date().toLocaleDateString("en-NG"),
          reference,
        }),
      }).catch((err) => console.error("[webhook] receipt email failed", err)),
    )
  }

  // Alert to estate admin
  if (estate.admin?.email) {
    tasks.push(
      sendEmail({
        to: estate.admin.email,
        subject: `Payment Received - ${unit.label} - ${collection.title}`,
        html: paymentAlertHtml({
          estateName: estate.name,
          collectionTitle: collection.title,
          amount: formatNaira(payment.amountKobo),
          unitLabel: unit.label,
          zoneName: unit.zone.name,
          residentName: unit.residentName,
          paidAt: new Date().toLocaleDateString("en-NG"),
        }),
      }).catch((err) => console.error("[webhook] alert email failed", err)),
    )
  }

  // Test notification to NOTIFY_EMAIL
  if (env.NOTIFY_EMAIL) {
    tasks.push(
      sendEmail({
        to: env.NOTIFY_EMAIL,
        subject: `[Test] Payment Received - ${unit.label} - ${collection.title}`,
        html: paymentAlertHtml({
          estateName: estate.name,
          collectionTitle: collection.title,
          amount: formatNaira(payment.amountKobo),
          unitLabel: unit.label,
          zoneName: unit.zone.name,
          residentName: unit.residentName,
          paidAt: new Date().toLocaleDateString("en-NG"),
        }),
      }).catch((err) => console.error("[webhook] notify email failed", err)),
    )
  }

  if (tasks.length > 0) await Promise.allSettled(tasks)
}

async function sendFailedEmails(
  payment: {
    amountKobo: number
    collection: {
      title: string
      estate: { name: string; admin: { email: string } | null }
    }
    unit: {
      label: string
      zone: { name: string }
      residentEmail: string | null
    }
  },
) {
  const { collection, unit } = payment
  const env = getEnv()
  const tasks: Promise<void>[] = []

  if (unit.residentEmail) {
    tasks.push(
      sendEmail({
        to: unit.residentEmail,
        subject: `Payment Failed - ${collection.title}`,
        html: paymentFailedHtml({
          estateName: collection.estate.name,
          collectionTitle: collection.title,
          amount: formatNaira(payment.amountKobo),
          unitLabel: unit.label,
          zoneName: unit.zone.name,
        }),
      }).catch((err) => console.error("[webhook] failed email error", err)),
    )
  }

  // Notify admin of failure too
  if (collection.estate.admin?.email) {
    tasks.push(
      sendEmail({
        to: collection.estate.admin.email,
        subject: `Payment Failed - ${unit.label} - ${collection.title}`,
        html: paymentFailedHtml({
          estateName: collection.estate.name,
          collectionTitle: collection.title,
          amount: formatNaira(payment.amountKobo),
          unitLabel: unit.label,
          zoneName: unit.zone.name,
        }),
      }).catch((err) => console.error("[webhook] failed alert email error", err)),
    )
  }

  // Test notification to NOTIFY_EMAIL
  if (env.NOTIFY_EMAIL) {
    tasks.push(
      sendEmail({
        to: env.NOTIFY_EMAIL,
        subject: `[Test] Payment Failed - ${unit.label} - ${collection.title}`,
        html: paymentFailedHtml({
          estateName: collection.estate.name,
          collectionTitle: collection.title,
          amount: formatNaira(payment.amountKobo),
          unitLabel: unit.label,
          zoneName: unit.zone.name,
        }),
      }).catch((err) => console.error("[webhook] failed notify email error", err)),
    )
  }

  if (tasks.length > 0) await Promise.allSettled(tasks)
}
