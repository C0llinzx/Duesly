import { z } from "zod/v4"

export const unitSchema = z.object({
  zoneId: z.string().uuid(),
  label: z.string().min(1).max(20),
  address: z.string().optional(),
  residentName: z.string().optional(),
  phone1: z.string().optional(),
  phone2: z.string().optional(),
  residentEmail: z.string().email().optional().or(z.literal("")),
  occupancyType: z.enum(["owner", "renter"]).optional(),
  status: z.enum(["active", "exempt", "inactive"]).optional(),
})

export const zoneSchema = z.object({
  name: z.string().min(1).max(100),
})

export type UnitInput = z.infer<typeof unitSchema>
export type ZoneInput = z.infer<typeof zoneSchema>
