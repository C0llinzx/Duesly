import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { verifyPassword, createSession } from "@/lib/auth"
import { loginSchema } from "@/lib/validation/auth"
import { checkRateLimit } from "@/lib/rate-limiter"

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "unknown"
    if (!checkRateLimit(`login:${ip}`, 5, 60000)) {
      return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 })
    }

    const body = await request.json()
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 })
    }

    const { email, password } = parsed.data

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    const valid = await verifyPassword(password, user.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    await createSession({ userId: user.id, email: user.email })

    return NextResponse.json({ ok: true, user: { id: user.id, name: user.name, email: user.email } })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
