import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import "../app/(marketing)/_styles/duesly-theme.css"
import LandingPage from "./LandingPage"

interface HomeProps {
  searchParams: Promise<{ landing?: string }>
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams
  const session = await getSession()

  // Allow authenticated users to view the landing page via ?landing=true
  // (used by the dashboard "Back to site" link)
  if (session && params.landing !== "true") redirect("/dashboard")

  return (
    <div className="duesly-landing">
      <LandingPage />
    </div>
  )
}
