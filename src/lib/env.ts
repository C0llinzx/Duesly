import { z } from "zod"

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
  APP_URL: z.string().url().default("http://localhost:3000"),
  PAYMENT_GATEWAY: z.enum(["paystack"]).default("paystack"),
  PAYSTACK_SECRET_KEY: z.string().min(1).optional(),
  PAYSTACK_PUBLIC_KEY: z.string().min(1).optional(),
  SERVICE_FEE_PERCENT: z.coerce.number().optional(),
  SERVICE_FEE_FLAT_KOBO: z.coerce.number().optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: z.string().default("Duesly <onboarding@resend.dev>"),
  NOTIFY_EMAIL: z.string().email().optional(),
})

export type Env = z.infer<typeof envSchema>

let _env: Env | null = null

export function getEnv(): Env {
  if (_env) return _env
  const result = envSchema.safeParse(process.env)
  if (!result.success) {
    console.error("Invalid environment variables:", result.error.flatten())
    throw new Error("Invalid environment variables. Check server logs.")
  }
  _env = result.data
  return _env
}
