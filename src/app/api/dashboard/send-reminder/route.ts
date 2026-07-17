import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { formatNaira } from "@/lib/money"
import { sendEmail, reminderHtml } from "@/lib/email"

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { collectionId, unitId } = await request.json()
    if (!collectionId || !unitId) {
      return NextResponse.json({ error: "Missing collectionId or unitId" }, { status: 400 })
    }

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
    if (paidUnitIds.has(unitId)) {
      return NextResponse.json({ error: "Unit has already paid" }, { status: 400 })
    }

    const unit = estate.zones
      .flatMap((z) => z.units)
      .find((u) => u.id === unitId)

    if (!unit || !unit.residentEmail || unit.status !== "active") {
      return NextResponse.json({ error: "Unit not found or no email on file" }, { status: 400 })
    }

    const zone = estate.zones.find((z) => z.units.some((u) => u.id === unitId))
    const paymentLink = `${process.env.APP_URL ?? "http://localhost:3000"}/pay/${collection.slug}`

    await sendEmail({
      to: unit.residentEmail,
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
    })

    return NextResponse.json({ sent: 1 })
  } catch (error) {
    console.error("Send reminder error:", error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
