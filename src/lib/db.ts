import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const url = process.env.DATABASE_URL

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: url ? new PrismaPg(url) : undefined,
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
