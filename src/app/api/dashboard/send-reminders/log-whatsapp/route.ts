import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { collectionId, unitIds } = await request.json()
    if (!collectionId || !Array.isArray(unitIds) || unitIds.length === 0) {
      return NextResponse.json({ error: "Missing collectionId or unitIds" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { estate: true },
    })
    if (!user?.estate) return NextResponse.json({ error: "No estate" }, { status: 404 })

    const collection = await prisma.collection.findUnique({ where: { id: collectionId } })
    if (!collection || collection.estateId !== user.estate.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    for (const unitId of unitIds) {
      const payment = await prisma.payment.upsert({
        where: { collectionId_unitId: { collectionId, unitId } },
        update: {},
        create: { unitId, collectionId, amountKobo: collection.amountKobo, status: "pending" },
      })
      await prisma.paymentLog.create({
        data: { paymentId: payment.id, event: "reminder_sent", metadata: { channel: "whatsapp" } },
      }).catch(() => {})
    }

    return NextResponse.json({ logged: unitIds.length })
  } catch (error) {
    console.error("Log WhatsApp reminders error:", error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
