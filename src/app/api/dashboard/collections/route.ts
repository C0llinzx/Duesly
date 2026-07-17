import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { createCollectionSchema } from "@/lib/validation/collection"

function generateSlug(title: string, estateName: string): string {
  const prefix = estateName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  const suffix = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  return `${prefix}-${suffix}`
}

export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        estate: {
          include: {
            collections: {
              orderBy: { createdAt: "desc" },
              include: { _count: { select: { payments: { where: { status: "success" } } } } },
            },
          },
        },
      },
    })

    if (!user?.estate) return NextResponse.json({ error: "No estate found" }, { status: 404 })

    return NextResponse.json({ collections: user.estate.collections })
  } catch (error) {
    console.error("Collections GET error:", error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const parsed = createCollectionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { estate: true },
    })

    if (!user?.estate) return NextResponse.json({ error: "No estate found" }, { status: 404 })

    const slug = generateSlug(parsed.data.title, user.estate.name)

    const collection = await prisma.collection.create({
      data: {
        estateId: user.estate.id,
        slug,
        title: parsed.data.title,
        amountKobo: parsed.data.amountKobo,
        dueDate: new Date(parsed.data.dueDate),
      },
    })

    return NextResponse.json({ ok: true, collection })
  } catch (error) {
    console.error("Collections POST error:", error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
