import Papa from "papaparse"

export interface RosterRow {
  zone: string
  unit: string
  address?: string
  residentName?: string
  phone1?: string
  phone2?: string
  email?: string
}

export interface ParseResult {
  rows: RosterRow[]
  errors: { row: number; message: string }[]
  detectedDelimiter: string
}

function stripBom(s: string): string {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s
}

const fieldAliases: Record<string, string[]> = {
  zone: ["zone", "zonesection", "section", "block"],
  house: ["house", "housenumber", "houseno", "housenum", "no", "unit", "unitcode", "code", "flat", "apartment", "label", "lot"],
  address: ["address", "addres", "location", "addr", "houseaddress", "propertyaddress", "streetaddress", "street", "housenostreet", "housenoandstreet"],
  name: ["name", "residentname", "resident", "resname", "fullname", "ownername", "occupant", "residentname"],
  phone1: ["phone1", "phone", "phoneone", "telephone1", "mobile1", "mobile", "primaryphone", "primaryphone", "contact"],
  phone2: ["phone2", "phonetwo", "telephone2", "mobile2", "secondaryphone", "secondaryphone", "altphone", "alternativephone"],
  email: ["email", "residentemail", "resemail", "emailaddress", "emailaddress", "email"],
}

function buildLookup(fields: string[]): Record<string, string | undefined> {
  const normalized = new Map<string, string>()
  for (const f of fields) {
    const key = f.trim().toLowerCase().replace(/[^a-z0-9]/g, "")
    normalized.set(key, f)
  }
  const lookup: Record<string, string | undefined> = {}
  for (const [field, aliases] of Object.entries(fieldAliases)) {
    for (const alias of aliases) {
      const match = normalized.get(alias)
      if (match) {
        lookup[field] = match
        break
      }
    }
  }
  return lookup
}

export function parseRosterCsv(content: string): ParseResult {
  const cleaned = stripBom(content)

  const result = Papa.parse(cleaned, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  })

  const errors: { row: number; message: string }[] = []
  const rows: RosterRow[] = []

  const fields = result.meta.fields ?? []
  const lookup = buildLookup(fields)

  const zoneHeader = lookup.zone
  const houseHeader = lookup.house
  const nameHeader = lookup.name
  const phone1Header = lookup.phone1
  const phone2Header = lookup.phone2
  const emailHeader = lookup.email

  const addressHeader = lookup.address

  if (!zoneHeader) {
    return { rows: [], errors: [{ row: 1, message: "Column not found: Zone. Expected a column named Zone." }], detectedDelimiter: result.meta.delimiter ?? "," }
  }
  if (!houseHeader) {
    return { rows: [], errors: [{ row: 1, message: "Column not found: House. Expected a column named House." }], detectedDelimiter: result.meta.delimiter ?? "," }
  }

  for (let i = 0; i < result.data.length; i++) {
    const row = result.data[i] as Record<string, string>
    const zone = row[zoneHeader]?.trim()
    const house = row[houseHeader]?.trim()

    if (!zone && !house) {
      errors.push({ row: i + 2, message: "Missing Zone and House — both fields are blank." })
      continue
    }
    if (!zone) {
      errors.push({ row: i + 2, message: `Missing Zone — row has House "${house}" but Zone is blank.` })
      continue
    }
    if (!house) {
      errors.push({ row: i + 2, message: `Missing House — row has Zone "${zone}" but House is blank.` })
      continue
    }

    rows.push({
      zone,
      unit: house,
      address: addressHeader ? row[addressHeader]?.trim() || undefined : undefined,
      residentName: nameHeader ? row[nameHeader]?.trim() || undefined : undefined,
      phone1: phone1Header ? row[phone1Header]?.trim() || undefined : undefined,
      phone2: phone2Header ? row[phone2Header]?.trim() || undefined : undefined,
      email: emailHeader ? row[emailHeader]?.trim() || undefined : undefined,
    })
  }

  return {
    rows,
    errors,
    detectedDelimiter: result.meta.delimiter ?? ",",
  }
}
