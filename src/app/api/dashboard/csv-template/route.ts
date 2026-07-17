import { NextResponse } from "next/server"

export async function GET() {
  const headers = ["Zone", "House", "Address", "Name", "Phone1", "Phone2", "Email"]
  const csv = headers.join(",") + "\n"
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="estate-template.csv"',
    },
  })
}
