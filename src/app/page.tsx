import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import "../app/(marketing)/_styles/duesly-theme.css"
import LandingPage from "./LandingPage"

export default async function Home() {
  const session = await getSession()
  if (session) redirect("/dashboard")
  return (
    <div className="duesly-landing">
      <LandingPage />
    </div>
  )
}
