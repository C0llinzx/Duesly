import { defineConfig } from "@prisma/config"

export default defineConfig({
  schema: "./prisma/schema.prisma",
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: "postgresql://postgres:postgres@localhost:5432/duesly",
  },
})
