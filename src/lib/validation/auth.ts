import { z } from "zod/v4"

export const signupSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(8),
  password: z.string().min(8),
  estateName: z.string().min(2),
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export type SignupInput = z.infer<typeof signupSchema>
export type LoginInput = z.infer<typeof loginSchema>
