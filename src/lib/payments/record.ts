import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { getPaymentGateway } from "@/lib/payments"
import { formatNaira } from "@/lib/money"
import { sendEmail, paymentReceiptHtml, paymentAlertHtml } from "@/lib/email"
import { getEnv } from "@/lib/env"

type PaymentWithRelations = Prisma.PaymentGetPayload<{
  include: {
    collection: { include: { estate: { include: { admin: true } } } }
    unit: { include: { zone: true } }
  }
}>

export type RecordOutcome =
  | "success"
  | "already_processed"
  | "failed"
  | "pending"
  | "amount_mismatch"
  | "not_found"
  | "verify_error"

async function safeLog(paymentId: string, event: string, metadata: Record<string, unknown>) {
  try {
    await prisma.paymentLog.create({ data: { paymentId, event, metadata: metadata as Prisma.InputJsonValue } })
  } catch (err) {
    console.error("[payments] paymentLog.create failed", { paymentId, event, err })
  }
}

/**
 * The single place that turns a gateway's "this charge succeeded" signal into a recorded Payment.
 * Used by both the webhook handler and the browser status-poll fallback, so the two paths can
 * never drift apart on the amount check (see Duesly_Payment_Flow_Spec.md invariants #3-#5).
 */
export async function verifyAndRecordPayment(
  reference: string,
  source: "webhook" | "status_poll",
): Promise<RecordOutcome> {
  const payment = await prisma.payment.findUnique({
    where: { gatewayTxRef: reference },
    include: {
      collection: { include: { estate: { include: { admin: true } } } },
      unit: { include: { zone: true } },
    },
  })

  if (!payment) {
    console.error(`[${source}] payment not found for reference`, reference)
    return "not_found"
  }

  if (payment.status === "success") {
    return "already_processed"
  }

  const gateway = getPaymentGateway()
  let verified
  try {
    verified = await gateway.verifyPayment(reference)
  } catch (err) {
    console.error(`[${source}] gateway verify failed`, { reference, err })
    return "verify_error"
  }

  if (verified.status === "failed") {
    try {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: "failed" } })
    } catch (err) {
      console.error(`[${source}] payment update (failed) error`, { reference, err })
      return "verify_error"
    }
    await safeLog(payment.id, `${source}_verified_failed`, { reference })
    return "failed"
  }

  if (verified.status !== "success") {
    return "pending"
  }

  // ── Amount mismatch: do NOT record. Spec invariant #4 — never trust the webhook/verify
  // payload's status alone; a mismatched amount must not flip the unit to paid. ──
  const expectedTotal = payment.amountKobo + payment.feeKobo
  if (verified.amount !== expectedTotal) {
    console.error(`[${source}] amount mismatch`, {
      reference,
      expected: expectedTotal,
      expectedDue: payment.amountKobo,
      expectedFee: payment.feeKobo,
      received: verified.amount,
    })
    await safeLog(payment.id, `${source}_amount_mismatch`, {
      reference,
      expected: expectedTotal,
      expectedDue: payment.amountKobo,
      expectedFee: payment.feeKobo,
      received: verified.amount,
    })
    return "amount_mismatch"
  }

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
    console.error(`[${source}] payment update (success) error`, { reference, err })
    return "verify_error"
  }

  await safeLog(payment.id, `${source}_verified`, {
    reference,
    amountKobo: verified.amount,
    feeKobo: payment.feeKobo,
    gatewayId: verified.gatewayId,
    paidAt: verified.paidAt,
  })

  void sendSuccessEmails(payment, reference)

  return "success"
}

async function sendSuccessEmails(payment: PaymentWithRelations, reference: string) {
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
      }).catch((err) => console.error("[payments] receipt email failed", err)),
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
      }).catch((err) => console.error("[payments] alert email failed", err)),
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
      }).catch((err) => console.error("[payments] notify email failed", err)),
    )
  }

  if (tasks.length > 0) await Promise.allSettled(tasks)
}
