import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { formatNaira } from "@/lib/money"
import { sendEmail, reminderHtml } from "@/lib/email"

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { collectionId } = await request.json()
    if (!collectionId) return NextResponse.json({ error: "Missing collectionId" }, { status: 400 })

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { estate: { include: { zones: { include: { units: true } } } } },
    })

    if (!user?.estate) return NextResponse.json({ error: "No estate found" }, { status: 404 })
    const estate = user.estate

    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
      include: { payments: { where: { status: "success" }, select: { unitId: true } } },
    })

    if (!collection || collection.estateId !== estate.id) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 })
    }

    const paidUnitIds = new Set(collection.payments.map((p) => p.unitId))
    const paymentLink = `${process.env.NEXT_PUBLIC_BASE_URL || process.env.APP_URL || "http://localhost:3000"}/pay/${collection.slug}`

    const owingUnitsWithEmail = estate.zones
      .flatMap((z) => z.units)
      .filter((u) => !paidUnitIds.has(u.id) && u.residentEmail && u.status === "active")

    if (owingUnitsWithEmail.length === 0) {
      return NextResponse.json({ sent: 0, message: "No owing units with email on file" })
    }

    const emailPromises = owingUnitsWithEmail.map((unit) => {
      const zone = estate.zones.find((z) => z.units.some((u) => u.id === unit.id))
      return sendEmail({
        to: unit.residentEmail!,
        subject: `Reminder: ${collection.title} is due`,
        html: reminderHtml({
          estateName: estate.name,
          collectionTitle: collection.title,
          amount: formatNaira(collection.amountKobo),
          dueDate: new Date(collection.dueDate).toLocaleDateString("en-NG"),
          unitLabel: unit.label,
          zoneName: zone?.name ?? "",
          paymentLink,
        }),
      }).catch((err) => {
        console.error(`Failed to send reminder to ${unit.residentEmail}:`, err)
      })
    })

    Promise.all(emailPromises).catch((err) => console.error("Reminder batch error:", err))

    for (const unit of owingUnitsWithEmail) {
      const payment = await prisma.payment.upsert({
        where: { collectionId_unitId: { collectionId, unitId: unit.id } },
        update: {},
        create: { unitId: unit.id, collectionId, amountKobo: collection.amountKobo, status: "pending" },
      })
      await prisma.paymentLog.create({
        data: { paymentId: payment.id, event: "reminder_sent", metadata: { channel: "email" } },
      }).catch(() => {})
    }

    return NextResponse.json({ sent: owingUnitsWithEmail.length })
  } catch (error) {
    console.error("Send reminders error:", error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
