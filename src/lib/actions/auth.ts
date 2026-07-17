"use server"

import { prisma } from "@/lib/db"
import { verifyPassword, hashPassword, createSession } from "@/lib/auth"
import { redirect } from "next/navigation"

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

  try {
    const user = await prisma.user.findUnique({ where: { email: email.trim() } })
    if (!user) return { ok: false, errors: { _form: ["Email or password is incorrect"] } }
    const valid = await verifyPassword(password, user.passwordHash)
    if (!valid) return { ok: false, errors: { _form: ["Email or password is incorrect"] } }
    await createSession({ userId: user.id, email: user.email })
  } catch {
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

  try {
    const existing = await prisma.user.findUnique({ where: { email: email.trim() } })
    if (existing) return { ok: false, errors: { email: ["Email already registered"] } }

    const passwordHash = await hashPassword(password)
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim(),
        phone: "",
        passwordHash,
        estate: { create: { name: estateName.trim() } },
      },
    })
    await createSession({ userId: user.id, email: user.email })
  } catch {
    return { ok: false, errors: { _form: ["Something went wrong. Please try again."] } }
  }
  redirect("/dashboard")
}
