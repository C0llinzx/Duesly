import { z } from "zod/v4"

export const createCollectionSchema = z.object({
  title: z.string().min(2).max(200),
  amountKobo: z.number().int().positive(),
  dueDate: z.string().datetime(),
})

export const offlinePaymentSchema = z.object({
  collectionId: z.string().uuid(),
  unitId: z.string().uuid(),
})

export type CreateCollectionInput = z.infer<typeof createCollectionSchema>
export type OfflinePaymentInput = z.infer<typeof offlinePaymentSchema>
