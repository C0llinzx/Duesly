import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { hashPassword, createSession } from "@/lib/auth"
import { signupSchema } from "@/lib/validation/auth"
import { checkRateLimit } from "@/lib/rate-limiter"
import { sendEmail, welcomeHtml } from "@/lib/email"

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "unknown"
    if (!checkRateLimit(`signup:${ip}`, 3, 60000)) {
      return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 })
    }

    const body = await request.json()
    const parsed = signupSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 })
    }

    const { name, email, phone, password, estateName } = parsed.data

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 })
    }

    const passwordHash = await hashPassword(password)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        passwordHash,
        estate: {
          create: { name: estateName },
        },
      },
    })

    await createSession({ userId: user.id, email: user.email })

    sendEmail({
      to: email,
      subject: "Welcome to Duesly",
      html: welcomeHtml({
        name,
        estateName,
        dashboardUrl: `${process.env.APP_URL ?? "http://localhost:3000"}/dashboard`,
      }),
    }).catch((err) => console.error("Failed to send welcome email:", err))

    return NextResponse.json({ ok: true, user: { id: user.id, name: user.name, email: user.email } })
  } catch (error) {
    console.error("Signup error:", error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
