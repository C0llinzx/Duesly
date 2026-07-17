import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { formatNaira } from "@/lib/money"

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { estate: { include: { zones: true } } },
  })

  if (!user?.estate) return NextResponse.json({ error: "No estate" }, { status: 404 })

  const estate = user.estate
  const estateZoneIds = estate.zones.map((z) => z.id)

  const [payments, recentUnits, reminderLogs, recentCollections] = await Promise.all([
    prisma.payment.findMany({
      where: { unit: { zoneId: { in: estateZoneIds } }, status: "success", paidAt: { not: null } },
      orderBy: { paidAt: "desc" },
      take: 10,
      include: { unit: true, collection: true },
    }),
    prisma.unit.findMany({
      where: { zoneId: { in: estateZoneIds } },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { zone: true },
    }),
    prisma.paymentLog.findMany({
      where: { event: "reminder_sent", payment: { unit: { zoneId: { in: estateZoneIds } } } },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { payment: { include: { unit: true, collection: true } } },
    }),
    prisma.collection.findMany({
      where: { estateId: estate.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ])

  const activity: { type: string; label: string; description: string; timestamp: string }[] = []

  for (const p of payments) {
    const isOffline = p.method !== "online"
    const resident = p.unit.residentName ?? ""
    const detail = `${p.unit.label}${resident ? ` ${resident}` : ""}`
    activity.push({
      type: isOffline ? "offline_payment" : "payment",
      label: isOffline ? "Offline payment marked" : "Payment received",
      description: `${formatNaira(p.amountKobo)} received · ${detail}`,
      timestamp: p.paidAt!.toISOString(),
    })
  }

  for (const u of recentUnits) {
    const zoneName = u.zone.name.length === 1 ? `Zone ${u.zone.name}` : u.zone.name
    activity.push({
      type: "house_added",
      label: "House added",
      description: `${u.label} added to ${zoneName}`,
      timestamp: u.createdAt.toISOString(),
    })
  }

  for (const log of reminderLogs) {
    activity.push({
      type: "reminder",
      label: "Reminder sent",
      description: `Reminder sent to ${log.payment.unit.label} · ${log.payment.collection.title}`,
      timestamp: log.createdAt.toISOString(),
    })
  }

  for (const c of recentCollections) {
    activity.push({
      type: "levy_created",
      label: "Levy created",
      description: `${c.title} created · ${formatNaira(c.amountKobo)}/house`,
      timestamp: c.createdAt.toISOString(),
    })
  }

  activity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return NextResponse.json({ activity: activity.slice(0, 20) })
}
