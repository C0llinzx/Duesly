import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { estate: { select: { id: true } } },
  })
  if (!user?.estate) return NextResponse.json({ error: "no estate" }, { status: 400 })
  const estateId = user.estate.id

  const { searchParams } = new URL(req.url)
  const query = searchParams.get("query") ?? ""
  const collectionId = searchParams.get("collectionId")
  const method = searchParams.get("method")
  const from = searchParams.get("from")
  const to = searchParams.get("to")
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)))
  const sortBy = searchParams.get("sortBy") ?? "paidAt"
  const sortDir = searchParams.get("sortDir") ?? "desc"
  const csv = searchParams.get("csv") === "1"

  const where: Record<string, unknown> = {
    collection: { estateId },
    status: "success",
  }

  if (query) {
    where.OR = [
      { unit: { label: { contains: query, mode: "insensitive" } } },
      { unit: { residentName: { contains: query, mode: "insensitive" } } },
    ]
  }
  if (collectionId) where.collectionId = collectionId
  if (method) where.method = method
  if (from || to) {
    where.paidAt = {}
    if (from) (where.paidAt as Record<string, Date>).gte = new Date(from)
    if (to) (where.paidAt as Record<string, Date>).lte = new Date(to + "T23:59:59.999Z")
  }

  const orderBy: Record<string, string> = {}
  orderBy[sortBy === "amountKobo" ? "amountKobo" : "paidAt"] = sortDir === "asc" ? "asc" : "desc"

  const [collections, total, payments] = await Promise.all([
    prisma.collection.findMany({
      where: { estateId },
      select: { id: true, title: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.payment.count({ where }),
    prisma.payment.findMany({
      where,
      select: {
        id: true,
        amountKobo: true,
        feeKobo: true,
        method: true,
        status: true,
        gatewayTxRef: true,
        gatewayTxId: true,
        paidAt: true,
        createdAt: true,
        unit: { select: { id: true, label: true, address: true, residentName: true, zone: { select: { name: true } } } },
        collection: { select: { id: true, title: true } },
      },
      orderBy,
      skip: (page - 1) * limit,
      take: csv ? 10000 : limit,
    }),
  ])

  if (csv) {
    const header = "Date,Time,House,Address,Resident,Zone,Levy,Fee (₦),Total (₦),Method\n"
    const rows = payments.map((p) => {
      const d = p.paidAt ? new Date(p.paidAt) : new Date(p.createdAt)
      const date = d.toLocaleDateString("en-NG")
      const time = d.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })
      const levy = Math.round(p.amountKobo / 100)
      const fee = Math.round(p.feeKobo / 100)
      return `${date},${time},"${p.unit.label}","${p.unit.address ?? ""}","${p.unit.residentName ?? ""}","${p.unit.zone.name}","${p.collection.title}",${levy},${fee},${levy + fee},${p.method}`
    }).join("\n")
    return new NextResponse(header + rows, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="payments-export.csv"`,
      },
    })
  }

  return NextResponse.json({
    payments: payments.map((p) => ({
      id: p.id,
      amountKobo: p.amountKobo,
      feeKobo: p.feeKobo,
      method: p.method,
      status: p.status,
      gatewayTxRef: p.gatewayTxRef,
      gatewayTxId: p.gatewayTxId,
      paidAt: p.paidAt?.toISOString() ?? p.createdAt.toISOString(),
      createdAt: p.createdAt.toISOString(),
      unitLabel: p.unit.label,
      address: p.unit.address,
      residentName: p.unit.residentName,
      zoneName: p.unit.zone.name,
      collectionId: p.collection.id,
      collectionTitle: p.collection.title,
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    collections,
  })
}
