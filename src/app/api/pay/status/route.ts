import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getPaymentGateway } from "@/lib/payments"
import { sendEmail, paymentReceiptHtml, paymentAlertHtml } from "@/lib/email"
import { formatNaira } from "@/lib/money"
import { getEnv } from "@/lib/env"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const reference = searchParams.get("reference")

  if (!reference) {
    return NextResponse.json({ error: "Missing reference" }, { status: 400 })
  }

  const payment = await prisma.payment.findUnique({
    where: { gatewayTxRef: reference },
    include: {
      collection: { include: { estate: { include: { admin: true } } } },
      unit: { include: { zone: true } },
    },
  })

  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 })
  }

  // If already resolved, return immediately
  if (payment.status === "success" || payment.status === "failed") {
    return NextResponse.json({ status: payment.status })
  }

  // Payment still pending — webhook hasn't fired yet. Proactively verify with Paystack.
  const gateway = getPaymentGateway()
  try {
    const verified = await gateway.verifyPayment(reference)

    if (verified.status === "success") {
      const now = new Date()

      // Update payment record
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "success",
          gatewayTxId: verified.gatewayId,
          paidAt: verified.paidAt ? new Date(verified.paidAt) : now,
        },
      })

      // Audit log
      try {
        await prisma.paymentLog.create({
          data: {
            paymentId: payment.id,
            event: "proactive_verified",
            metadata: {
              reference,
              amountKobo: verified.amount,
              feeKobo: payment.feeKobo,
              gatewayId: verified.gatewayId,
              paidAt: verified.paidAt,
            },
          },
        })
      } catch {
        // non-fatal
      }

      // Send emails
      void sendSuccessEmails(payment, reference)

      return NextResponse.json({ status: "success" })
    }

    if (verified.status === "failed") {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "failed" },
      })

      try {
        await prisma.paymentLog.create({
          data: {
            paymentId: payment.id,
            event: "proactive_verified_failed",
            metadata: { reference },
          },
        })
      } catch {
        // non-fatal
      }

      return NextResponse.json({ status: "failed" })
    }
  } catch (err) {
    console.error("[pay/status] proactive verify failed", { reference, err })
  }

  // Still pending — return current status
  return NextResponse.json({ status: payment.status })
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
      }).catch((err) => console.error("[pay/status] receipt email failed", err)),
    )
  }

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
      }).catch((err) => console.error("[pay/status] alert email failed", err)),
    )
  }

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
      }).catch((err) => console.error("[pay/status] notify email failed", err)),
    )
  }

  if (tasks.length > 0) await Promise.allSettled(tasks)
}
