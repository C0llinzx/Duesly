import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcryptjs"
import { readFileSync } from "fs"
import { join } from "path"

const envPath = join(__dirname, "..", ".env")
const envContent = readFileSync(envPath, "utf-8")
for (const line of envContent.split("\n")) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith("#")) continue
  const eqIdx = trimmed.indexOf("=")
  if (eqIdx === -1) continue
  const key = trimmed.slice(0, eqIdx).trim()
  let val = trimmed.slice(eqIdx + 1).trim()
  if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
  process.env[key] = val
}

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error("DATABASE_URL not found in .env")

const prisma = new PrismaClient({ adapter: new PrismaPg(databaseUrl) })

const SALT_ROUNDS = 10

async function main() {
  console.log("Seeding demo data...")

  await prisma.paymentLog.deleteMany({})
  await prisma.payment.deleteMany({})
  await prisma.collection.deleteMany({})
  await prisma.unit.deleteMany({})
  await prisma.zone.deleteMany({})
  await prisma.estate.deleteMany({})
  await prisma.user.deleteMany({})

  const passwordHash = await bcrypt.hash("demo1234", SALT_ROUNDS)
  const user = await prisma.user.create({
    data: { name: "Demo Admin", email: "demo@duesly.app", phone: "+2348000000000", passwordHash },
  })
  console.log(`  User: ${user.email}`)

  const estate = await prisma.estate.create({
    data: { name: "Gemade Estate", adminId: user.id },
  })
  console.log(`  Estate: ${estate.name}`)

  const zoneNames = ["Block A", "Block B", "Block C"]
  const zones: { id: string; name: string }[] = []
  for (const name of zoneNames) {
    zones.push(await prisma.zone.create({ data: { name, estateId: estate.id } }))
  }
  console.log(`  Zones: ${zones.map((z) => z.name).join(", ")}`)

  const unitDefs: { zi: number; label: string; name: string; phone: string }[] = [
    { zi: 0, label: "1A", name: "Olu Adeyemi", phone: "08031234567" },
    { zi: 0, label: "1B", name: "Chioma Obi", phone: "08051234567" },
    { zi: 0, label: "1C", name: "Tunde Bakare", phone: "08071234567" },
    { zi: 0, label: "1D", name: "Aisha Mohammed", phone: "08091234567" },
    { zi: 0, label: "1E", name: "Emeka Nwosu", phone: "07031234567" },
    { zi: 0, label: "2A", name: "Ngozi Okonkwo", phone: "08021234567" },
    { zi: 0, label: "2B", name: "Segun Adebayo", phone: "08041234567" },
    { zi: 0, label: "2C", name: "Fatima Bello", phone: "08061234567" },
    { zi: 0, label: "2D", name: "Chidi Eze", phone: "08081234567" },
    { zi: 0, label: "2E", name: "Yetunde Alabi", phone: "07041234567" },
    { zi: 0, label: "3A", name: "Kunle Ogunlesi", phone: "08011234567" },
    { zi: 0, label: "3B", name: "Funke Balogun", phone: "08031234568" },
    { zi: 0, label: "3C", name: "Ibrahim Danjuma", phone: "08051234568" },
    { zi: 0, label: "3D", name: "Amara Okafor", phone: "08071234568" },
    { zi: 0, label: "3E", name: "Babatunde Olawale Adeyinka", phone: "08091234568" },
    { zi: 1, label: "1A", name: "Grace Ogunbiyi", phone: "07051234567" },
    { zi: 1, label: "1B", name: "Musa Suleiman", phone: "07061234567" },
    { zi: 1, label: "1C", name: "Folake Adeniran", phone: "07071234567" },
    { zi: 1, label: "1D", name: "Chuka Okeke", phone: "07081234567" },
    { zi: 1, label: "2A", name: "Rashidat Lawal", phone: "07091234567" },
    { zi: 1, label: "2B", name: "Dele Akinwunmi", phone: "08011234568" },
    { zi: 1, label: "2C", name: "Nnenna Okafor", phone: "08031234569" },
    { zi: 1, label: "2D", name: "Kayode Fashola", phone: "08051234569" },
    { zi: 1, label: "3A", name: "Zainab Abdullahi", phone: "08071234569" },
    { zi: 1, label: "3B", name: "Rotimi Adegoke", phone: "08091234569" },
    { zi: 1, label: "3C", name: "Ifeanyi Mbakwe", phone: "07051234568" },
    { zi: 1, label: "3D", name: "Simisola Ogunleye", phone: "07061234568" },
    { zi: 1, label: "4A", name: "Bala Usman", phone: "07071234568" },
    { zi: 1, label: "4B", name: "Temidayo Ogunlade", phone: "07081234568" },
    { zi: 1, label: "4C", name: "Chinwe Ibe", phone: "07091234568" },
    { zi: 1, label: "4D", name: "Femi Awolowo", phone: "08011234569" },
    { zi: 1, label: "5A", name: "Hauwa Bature", phone: "08031234570" },
    { zi: 1, label: "5B", name: "Ebuka Okafor", phone: "08051234570" },
    { zi: 1, label: "5C", name: "Ronke Adeniyi", phone: "08071234570" },
    { zi: 1, label: "5D", name: "Tajudeen Bello", phone: "08091234570" },
    { zi: 2, label: "1A", name: "Yemi Alade", phone: "07051234569" },
    { zi: 2, label: "1B", name: "Kelechi Nwosu", phone: "07061234569" },
    { zi: 2, label: "1C", name: "Mfon Udoh", phone: "07071234569" },
    { zi: 2, label: "2A", name: "Dapo Ogunbiyi", phone: "07081234569" },
    { zi: 2, label: "2B", name: "Nneka Eze", phone: "07091234569" },
  ]

  const units: { id: string; zoneId: string; label: string }[] = []
  for (const def of unitDefs) {
    units.push(await prisma.unit.create({
      data: { zoneId: zones[def.zi].id, label: def.label, residentName: def.name, phone1: def.phone },
    }))
  }
  console.log(`  Units: ${units.length} total`)

  const collection = await prisma.collection.create({
    data: {
      estateId: estate.id,
      title: "Service Charge — January",
      slug: "gemade-estate-service-charge-january",
      amountKobo: 15_000_00,
      dueDate: new Date("2026-01-31"),
      status: "active",
    },
  })
  console.log(`  Collection: ${collection.title}`)

  const owedInBlockA = new Set(["3B", "3D", "3E"])
  const owedInBlockB = new Set(["4D", "5A", "5B", "5D"])
  const owedInBlockC = new Set(["1A", "1B", "1C", "2A", "2B"])

  let paidCount = 0
  for (const unit of units) {
    const zone = zones.find((z) => z.id === unit.zoneId)!
    const owed = zone.name === "Block A" ? owedInBlockA
      : zone.name === "Block B" ? owedInBlockB
      : owedInBlockC
    if (!owed.has(unit.label)) {
      const paidAt = new Date()
      paidAt.setDate(paidAt.getDate() - Math.floor(Math.random() * 14))
      await prisma.payment.create({
        data: {
          collectionId: collection.id,
          unitId: unit.id,
          amountKobo: 15_000_00,
          method: "online",
          status: "success",
          paidAt,
        },
      })
      paidCount++
    }
  }
  console.log(`  Payments: ${paidCount} paid, ${units.length - paidCount} owing`)
  console.log("\n✅ Seed complete!  Login: demo@duesly.app / demo1234")
}

main().catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
