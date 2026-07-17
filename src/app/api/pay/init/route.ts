import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getPaymentGateway } from "@/lib/payments"
import { checkRateLimit } from "@/lib/rate-limiter"
import { calculateFee } from "@/lib/fees"

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "unknown"
    if (!checkRateLimit(`pay:${ip}`, 10, 60000)) {
      return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 })
    }

    const { collectionId, unitId, email: emailOverride } = await request.json()

    if (!collectionId || !unitId) {
      return NextResponse.json({ error: "Missing collectionId or unitId" }, { status: 400 })
    }

    if (emailOverride !== undefined && emailOverride !== null && typeof emailOverride !== "string") {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 })
    }

    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
      include: { estate: { include: { admin: true } } },
    })

    if (!collection) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 })
    }

    if (collection.status !== "active") {
      return NextResponse.json({ error: "This collection is closed" }, { status: 403 })
    }

    const unit = await prisma.unit.findUnique({
      where: { id: unitId },
      include: { zone: true },
    })

    if (!unit || unit.status !== "active") {
      return NextResponse.json({ error: "Unit not found" }, { status: 404 })
    }

    const existingPayment = await prisma.payment.findUnique({
      where: { collectionId_unitId: { collectionId, unitId } },
    })

    if (existingPayment?.status === "success") {
      return NextResponse.json({ error: "This unit is already paid for this collection" }, { status: 409 })
    }

    const reference = `DUESLY-${collection.id.slice(0, 8)}-${unit.id.slice(0, 8)}-${Date.now()}`
    const feeKobo = calculateFee(collection.amountKobo)
    const totalKobo = collection.amountKobo + feeKobo

    const payment = existingPayment
      ? await prisma.payment.update({
          where: { id: existingPayment.id },
          data: { gatewayTxRef: reference, amountKobo: collection.amountKobo, feeKobo, method: "online", status: "pending" },
        })
      : await prisma.payment.create({
          data: {
            collectionId,
            unitId,
            amountKobo: collection.amountKobo,
            feeKobo,
            method: "online",
            status: "pending",
            gatewayTxRef: reference,
          },
        })

    try {
      await prisma.paymentLog.create({
        data: {
          paymentId: payment.id,
          event: "payment_initiated",
          metadata: { reference, feeKobo, totalKobo },
        },
      })
    } catch (logErr) {
      console.error("[pay/init] paymentLog.create failed (non-fatal)", logErr)
    }

    const callbackUrl = `${process.env.APP_URL ?? "http://localhost:3000"}/pay/${collection.slug}/receipt?reference=${reference}`

    const gateway = getPaymentGateway()
    const payEmail = (emailOverride && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailOverride))
      ? emailOverride
      : unit.residentEmail ?? collection.estate.admin.email

    const result = await gateway.initPayment({
      email: payEmail,
      amountKobo: totalKobo,
      reference,
      callbackUrl,
      metadata: {
        collectionId: collection.id,
        unitId: unit.id,
        estateName: collection.estate.name,
      },
    })

    return NextResponse.json({
      authorizationUrl: result.authorizationUrl,
      accessCode: result.accessCode,
      reference,
    })
  } catch (error) {
    console.error("[pay.init] unexpected error", error)
    return NextResponse.json(
      { error: "Something went wrong on our end. You were NOT charged. Please try again." },
      { status: 500 },
    )
  }
}
