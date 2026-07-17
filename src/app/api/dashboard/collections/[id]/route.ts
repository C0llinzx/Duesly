import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const body = await request.json()
    const { title, amountKobo, dueDate, status } = body

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { estate: true },
    })
    if (!user?.estate) return NextResponse.json({ error: "No estate" }, { status: 404 })

    const collection = await prisma.collection.findFirst({
      where: { id, estateId: user.estate.id },
      include: { _count: { select: { payments: { where: { status: "success" } } } } },
    })
    if (!collection) return NextResponse.json({ error: "Collection not found" }, { status: 404 })

    if (collection._count.payments > 0 && amountKobo !== undefined && amountKobo !== collection.amountKobo) {
      return NextResponse.json({ error: "Amount locked: payments already received" }, { status: 403 })
    }

    const updated = await prisma.collection.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(amountKobo !== undefined && { amountKobo }),
        ...(dueDate !== undefined && { dueDate: new Date(dueDate) }),
        ...(status !== undefined && { status }),
      },
    })

    return NextResponse.json({ ok: true, collection: updated })
  } catch (error) {
    console.error("Collection PATCH error:", error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { estate: true },
    })
    if (!user?.estate) return NextResponse.json({ error: "No estate" }, { status: 404 })

    const collection = await prisma.collection.findFirst({
      where: { id, estateId: user.estate.id },
    })
    if (!collection) return NextResponse.json({ error: "Collection not found" }, { status: 404 })

    await prisma.collection.delete({ where: { id } })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Collection DELETE error:", error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
