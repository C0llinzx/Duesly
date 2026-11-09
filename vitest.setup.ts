import { readFileSync, existsSync } from "fs"
import { join } from "path"

for (const filename of [".env.local", ".env"]) {
  const envPath = join(__dirname, filename)
  if (!existsSync(envPath)) continue
  const content = readFileSync(envPath, "utf-8")
  for (const line of content.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eqIdx = trimmed.indexOf("=")
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    let val = trimmed.slice(eqIdx + 1).trim()
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
    if (process.env[key] === undefined) process.env[key] = val
  }
}
