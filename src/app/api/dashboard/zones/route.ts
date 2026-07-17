import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { zoneSchema } from "@/lib/validation/units"

export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { estate: { include: { zones: { include: { _count: { select: { units: true } } }, orderBy: { name: "asc" } } } } },
    })

    if (!user?.estate) return NextResponse.json({ error: "No estate found" }, { status: 404 })

    return NextResponse.json({ zones: user.estate.zones })
  } catch (error) {
    console.error("Zones GET error:", error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const parsed = zoneSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { estate: true },
    })

    if (!user?.estate) return NextResponse.json({ error: "No estate found" }, { status: 404 })

    const zone = await prisma.zone.create({
      data: { estateId: user.estate.id, name: parsed.data.name },
    })

    return NextResponse.json({ ok: true, zone })
  } catch (error) {
    console.error("Zones POST error:", error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
