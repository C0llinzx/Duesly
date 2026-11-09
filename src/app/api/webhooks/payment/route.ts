import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getPaymentGateway } from "@/lib/payments"
import { verifyAndRecordPayment } from "@/lib/payments/record"
import { formatNaira } from "@/lib/money"
import { sendEmail, paymentFailedHtml } from "@/lib/email"
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
  const gateway = getPaymentGateway()

  if (!gateway.verifyWebhookSignature(body, request.headers)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  const parsed = gateway.parseWebhookEvent(body)

  if (!parsed.reference || parsed.type === "ignored") {
    return NextResponse.json({ status: "ignored" }, { status: 200 })
  }

  // ── charge.failed: trust the signed webhook event directly (no re-verify needed — ──
  // ── the signature already proves it came from the gateway). Never overwrites a success. ──
  if (parsed.type === "failed") {
    const payment = await prisma.payment.findUnique({
      where: { gatewayTxRef: parsed.reference },
      include: {
        collection: { include: { estate: { include: { admin: true } } } },
        unit: { include: { zone: true } },
      },
    })

    if (!payment) {
      console.error("[webhook] payment not found for reference", parsed.reference)
      return NextResponse.json({ status: "ignored" }, { status: 200 })
    }

    if (payment.status !== "success") {
      try {
        await prisma.payment.update({ where: { id: payment.id }, data: { status: "failed" } })
      } catch (err) {
        console.error("[webhook] payment update (failed) error", { reference: parsed.reference, err })
        return NextResponse.json({ status: "db_error" }, { status: 500 })
      }

      await safeLog(payment.id, "webhook_charge_failed", { reference: parsed.reference })
      void sendFailedEmails(payment)
    }

    return NextResponse.json({ status: "logged" }, { status: 200 })
  }

  // ── charge.success: verify + amount-check + record, via the shared recorder ──
  const outcome = await verifyAndRecordPayment(parsed.reference, "webhook")

  return NextResponse.json({ status: outcome }, { status: 200 })
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
