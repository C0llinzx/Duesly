"use server"

import { prisma } from "@/lib/db"
import { verifyPassword, hashPassword, createSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import crypto from "crypto"
import { sendEmail, passwordResetHtml, welcomeHtml } from "@/lib/email"
import { checkRateLimit } from "@/lib/rate-limiter"

async function clientIp(): Promise<string> {
  const h = await headers()
  return h.get("x-forwarded-for") ?? "unknown"
}

export type ActionResult = {
  ok: boolean
  errors?: Record<string, string[]>
}

export async function loginAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const email = (formData.get("email") as string) ?? ""
  const password = (formData.get("password") as string) ?? ""

  const errors: Record<string, string[]> = {}
  if (!email.trim()) errors.email = ["This field cannot be empty"]
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = ["Enter a valid email address"]
  if (!password) errors.password = ["This field cannot be empty"]
  if (Object.keys(errors).length > 0) return { ok: false, errors }

  if (!checkRateLimit(`login:${await clientIp()}`, 5, 60000)) {
    return { ok: false, errors: { _form: ["Too many attempts. Try again in a minute."] } }
  }

  try {
    const user = await prisma.user.findUnique({ where: { email: email.trim() } })
    if (!user) return { ok: false, errors: { _form: ["Email or password is incorrect"] } }
    const valid = await verifyPassword(password, user.passwordHash)
    if (!valid) return { ok: false, errors: { _form: ["Email or password is incorrect"] } }
    await createSession({ userId: user.id, email: user.email })
  } catch (err) {
    console.error("Login action error:", err)
    return { ok: false, errors: { _form: ["Email or password is incorrect"] } }
  }
  redirect("/dashboard")
}

export async function signupAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const name = (formData.get("name") as string) ?? ""
  const email = (formData.get("email") as string) ?? ""
  const estateName = (formData.get("estateName") as string) ?? ""
  const password = (formData.get("password") as string) ?? ""

  const errors: Record<string, string[]> = {}
  if (!name.trim()) errors.name = ["This field cannot be empty"]
  if (!email.trim()) errors.email = ["This field cannot be empty"]
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = ["Enter a valid email address"]
  if (!estateName.trim()) errors.estateName = ["This field cannot be empty"]
  if (!password) {
    errors.password = ["This field cannot be empty"]
  } else {
    const reqs: string[] = []
    if (password.length < 8) reqs.push("At least 8 characters")
    if (!/[A-Z]/.test(password)) reqs.push("One uppercase letter")
    if (!/[a-z]/.test(password)) reqs.push("One lowercase letter")
    if (!/[0-9]/.test(password)) reqs.push("One number")
    if (reqs.length > 0) errors.password = reqs
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors }

  if (!checkRateLimit(`signup:${await clientIp()}`, 3, 60000)) {
    return { ok: false, errors: { _form: ["Too many attempts. Try again in a minute."] } }
  }

  let user: { id: string; name: string; email: string }
  try {
    const existing = await prisma.user.findUnique({ where: { email: email.trim() } })
    if (existing) return { ok: false, errors: { email: ["Email already registered"] } }

    const passwordHash = await hashPassword(password)
    user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim(),
        phone: "",
        passwordHash,
        estate: { create: { name: estateName.trim() } },
      },
    })
    await createSession({ userId: user.id, email: user.email })
  } catch (err) {
    console.error("Signup action error:", err)
    return { ok: false, errors: { _form: ["Something went wrong. Please try again."] } }
  }

  sendEmail({
    to: user.email,
    subject: "Welcome to Duesly",
    html: welcomeHtml({
      name: user.name,
      estateName: estateName.trim(),
      dashboardUrl: `${process.env.APP_URL ?? "http://localhost:3000"}/dashboard`,
    }),
  }).catch((err) => console.error("Failed to send welcome email:", err))

  redirect("/dashboard")
}

export async function requestPasswordResetAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const email = (formData.get("email") as string) ?? ""

  if (!email.trim()) {
    return { ok: false, errors: { email: ["This field cannot be empty"] } }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return { ok: false, errors: { email: ["Enter a valid email address"] } }
  }

  try {
    const user = await prisma.user.findUnique({ where: { email: email.trim() } })
    
    // Safety check: if user is not found, return success immediately to prevent enumeration
    if (!user) {
      return { ok: true }
    }

    // Delete any existing reset tokens
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id }
    })

    // Generate secure random token
    const token = crypto.randomBytes(32).toString("hex")
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    // Create reset token entry
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt
      }
    })

    // Build reset link
    const appUrl = process.env.APP_URL ?? "http://localhost:3000"
    const resetLink = `${appUrl}/auth/reset?token=${token}`

    // Log link to terminal for local developer convenience
    if (process.env.NODE_ENV !== "production") {
      console.log("\n------------------------------------------------------------")
      console.log(`[dev] PASSWORD RESET LINK FOR ${user.email}:`)
      console.log(resetLink)
      console.log("------------------------------------------------------------\n")
    }

    // Send email
    await sendEmail({
      to: user.email,
      subject: "Reset your Duesly Password",
      html: passwordResetHtml({
        name: user.name,
        resetLink
      })
    })

  } catch (err) {
    console.error("Password reset request error:", err)
    // Return true anyway so attacker doesn't know it failed or if the email was valid
    return { ok: true }
  }

  return { ok: true }
}

export async function resetPasswordAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const token = (formData.get("token") as string) ?? ""
  const password = (formData.get("password") as string) ?? ""

  const errors: Record<string, string[]> = {}
  if (!token) errors._form = ["Reset token is missing"]
  if (!password) {
    errors.password = ["This field cannot be empty"]
  } else {
    const reqs: string[] = []
    if (password.length < 8) reqs.push("At least 8 characters")
    if (!/[A-Z]/.test(password)) reqs.push("One uppercase letter")
    if (!/[a-z]/.test(password)) reqs.push("One lowercase letter")
    if (!/[0-9]/.test(password)) reqs.push("One number")
    if (reqs.length > 0) errors.password = reqs
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors }

  try {
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true }
    })

    if (!resetToken || resetToken.expiresAt < new Date()) {
      return { ok: false, errors: { _form: ["Reset link is invalid or has expired. Please request a new one."] } }
    }

    // Hash password and update user
    const passwordHash = await hashPassword(password)
    await prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash }
    })

    // Clean up all reset tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: { userId: resetToken.userId }
    })

  } catch (err) {
    console.error("Reset password execution error:", err)
    return { ok: false, errors: { _form: ["Something went wrong. Please try again."] } }
  }

  redirect("/auth?reset=success")
}

