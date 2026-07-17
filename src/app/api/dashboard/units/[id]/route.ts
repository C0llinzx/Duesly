import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getSession } from "@/lib/auth"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const body = await request.json()
    const { residentName, phone1, phone2, residentEmail, occupancyType, status, address } = body

    const unit = await prisma.unit.findUnique({
      where: { id },
      include: { zone: { include: { estate: true } } },
    })

    if (!unit) return NextResponse.json({ error: "Unit not found" }, { status: 404 })
    if (unit.zone.estate.adminId !== session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const updated = await prisma.unit.update({
      where: { id },
      data: {
        ...(residentName !== undefined && { residentName }),
        ...(phone1 !== undefined && { phone1 }),
        ...(phone2 !== undefined && { phone2 }),
        ...(residentEmail !== undefined && { residentEmail: residentEmail || null }),
        ...(occupancyType !== undefined && { occupancyType }),
        ...(status !== undefined && { status }),
        ...(address !== undefined && { address }),
      },
    })

    return NextResponse.json({ ok: true, unit: updated })
  } catch (error) {
    console.error("Unit PATCH error:", error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
