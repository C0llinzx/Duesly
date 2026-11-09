import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest"
import { prisma } from "@/lib/db"

// Mock the gateway factory so tests control exactly what "verify" returns, without any
// network call to Paystack. Mock email sending too, so tests never attempt real delivery.
const verifyPayment = vi.fn()
vi.mock("@/lib/payments", () => ({
  getPaymentGateway: () => ({ verifyPayment }),
}))
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
  paymentReceiptHtml: vi.fn().mockReturnValue(""),
  paymentAlertHtml: vi.fn().mockReturnValue(""),
}))

// Imported after the mocks above so record.ts picks up the mocked modules.
const { verifyAndRecordPayment } = await import("./record")

const FIXTURE_PREFIX = "record-test"

let userId: string
let estateId: string
let zoneId: string
let collectionId: string
let unitCounter = 0

beforeAll(async () => {
  const user = await prisma.user.create({
    data: {
      name: "Record Test Admin",
      email: `${FIXTURE_PREFIX}-admin@example.com`,
      phone: "+2348000000000",
      passwordHash: "x",
    },
  })
  userId = user.id

  const estate = await prisma.estate.create({ data: { name: "Record Test Estate", adminId: userId } })
  estateId = estate.id

  const zone = await prisma.zone.create({ data: { name: "Record Test Zone", estateId } })
  zoneId = zone.id

  const collection = await prisma.collection.create({
    data: {
      estateId,
      slug: `${FIXTURE_PREFIX}-${Date.now()}`,
      title: "Record Test Due",
      amountKobo: 1_500_000,
      dueDate: new Date(),
      status: "active",
    },
  })
  collectionId = collection.id
})

afterAll(async () => {
  await prisma.payment.deleteMany({ where: { collectionId } })
  await prisma.collection.delete({ where: { id: collectionId } })
  await prisma.zone.delete({ where: { id: zoneId } })
  await prisma.estate.delete({ where: { id: estateId } })
  await prisma.user.delete({ where: { id: userId } })
  await prisma.$disconnect()
})

beforeEach(() => {
  verifyPayment.mockReset()
})

async function createPendingPayment(reference: string, overrides: { amountKobo?: number; feeKobo?: number } = {}) {
  // Each test gets its own unit — Payment has a unique (collectionId, unitId) constraint,
  // same as production, so reusing one unit across test cases would collide.
  const unit = await prisma.unit.create({
    data: { zoneId, label: `T${++unitCounter}`, residentEmail: `${FIXTURE_PREFIX}-resident@example.com` },
  })
  return prisma.payment.create({
    data: {
      collectionId,
      unitId: unit.id,
      amountKobo: overrides.amountKobo ?? 1_500_000,
      feeKobo: overrides.feeKobo ?? 15_000,
      method: "online",
      status: "pending",
      gatewayTxRef: reference,
    },
  })
}

describe("verifyAndRecordPayment", () => {
  it("records success when the gateway confirms success and the amount + currency match", async () => {
    const reference = `${FIXTURE_PREFIX}-success-${Date.now()}`
    await createPendingPayment(reference)
    verifyPayment.mockResolvedValue({
      status: "success",
      amount: 1_515_000, // amountKobo + feeKobo
      currency: "NGN",
      gatewayId: "gw_1",
      paidAt: new Date().toISOString(),
    })

    const outcome = await verifyAndRecordPayment(reference, "webhook")

    expect(outcome).toBe("success")
    const payment = await prisma.payment.findUnique({ where: { gatewayTxRef: reference } })
    expect(payment?.status).toBe("success")
    expect(payment?.gatewayTxId).toBe("gw_1")
    expect(payment?.paidAt).not.toBeNull()
  })

  it("is idempotent: a second call on an already-success payment is a no-op and never re-verifies", async () => {
    const reference = `${FIXTURE_PREFIX}-idempotent-${Date.now()}`
    await createPendingPayment(reference)
    verifyPayment.mockResolvedValue({
      status: "success",
      amount: 1_515_000,
      currency: "NGN",
      gatewayId: "gw_2",
      paidAt: new Date().toISOString(),
    })

    const first = await verifyAndRecordPayment(reference, "webhook")
    expect(first).toBe("success")
    expect(verifyPayment).toHaveBeenCalledTimes(1)

    const second = await verifyAndRecordPayment(reference, "status_poll")
    expect(second).toBe("already_processed")
    // The second call must short-circuit on the DB's own status check — it must not call the
    // gateway again. A duplicate webhook delivery must never re-verify, let alone re-record.
    expect(verifyPayment).toHaveBeenCalledTimes(1)
  })

  it("does NOT record success when the verified amount doesn't match amountKobo + feeKobo", async () => {
    const reference = `${FIXTURE_PREFIX}-amount-mismatch-${Date.now()}`
    await createPendingPayment(reference)
    verifyPayment.mockResolvedValue({
      status: "success",
      amount: 1_000_000, // short of the expected 1,515,000
      currency: "NGN",
      gatewayId: "gw_3",
      paidAt: new Date().toISOString(),
    })

    const outcome = await verifyAndRecordPayment(reference, "webhook")

    expect(outcome).toBe("amount_mismatch")
    const payment = await prisma.payment.findUnique({ where: { gatewayTxRef: reference }, include: { logs: true } })
    expect(payment?.status).toBe("pending") // never flipped to success
    expect(payment?.logs.some((l) => l.event.endsWith("_amount_mismatch"))).toBe(true)
  })

  it("does NOT record success when the verified currency isn't NGN", async () => {
    const reference = `${FIXTURE_PREFIX}-currency-mismatch-${Date.now()}`
    await createPendingPayment(reference)
    verifyPayment.mockResolvedValue({
      status: "success",
      amount: 1_515_000,
      currency: "GHS",
      gatewayId: "gw_4",
      paidAt: new Date().toISOString(),
    })

    const outcome = await verifyAndRecordPayment(reference, "webhook")

    expect(outcome).toBe("currency_mismatch")
    const payment = await prisma.payment.findUnique({ where: { gatewayTxRef: reference } })
    expect(payment?.status).toBe("pending")
  })

  it("does NOT record success when the collection has been closed since checkout", async () => {
    const reference = `${FIXTURE_PREFIX}-ineligible-collection-${Date.now()}`
    await createPendingPayment(reference)
    verifyPayment.mockResolvedValue({
      status: "success",
      amount: 1_515_000,
      currency: "NGN",
      gatewayId: "gw_5",
      paidAt: new Date().toISOString(),
    })

    await prisma.collection.update({ where: { id: collectionId }, data: { status: "closed" } })
    try {
      const outcome = await verifyAndRecordPayment(reference, "webhook")
      expect(outcome).toBe("ineligible")
      const payment = await prisma.payment.findUnique({ where: { gatewayTxRef: reference } })
      expect(payment?.status).toBe("pending")
    } finally {
      await prisma.collection.update({ where: { id: collectionId }, data: { status: "active" } })
    }
  })

  it("marks the payment failed when the gateway reports a failed charge", async () => {
    const reference = `${FIXTURE_PREFIX}-failed-${Date.now()}`
    await createPendingPayment(reference)
    verifyPayment.mockResolvedValue({
      status: "failed",
      amount: 0,
      currency: "NGN",
      gatewayId: "gw_6",
      paidAt: null,
    })

    const outcome = await verifyAndRecordPayment(reference, "webhook")

    expect(outcome).toBe("failed")
    const payment = await prisma.payment.findUnique({ where: { gatewayTxRef: reference } })
    expect(payment?.status).toBe("failed")
  })

  it("returns not_found for a reference with no matching payment", async () => {
    const outcome = await verifyAndRecordPayment("no-such-reference", "webhook")
    expect(outcome).toBe("not_found")
    expect(verifyPayment).not.toHaveBeenCalled()
  })
})
