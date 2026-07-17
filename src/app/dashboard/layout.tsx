import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/db"
import MevolutSidebar from "./MevolutSidebar"
import DashboardHeader from "./DashboardHeader"
import ShellZone from "./ShellZone"
import { ToastProvider } from "@/components/ToastProvider"
import d from "./mevolut.module.css"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect("/auth")

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { estate: true },
  })

  if (!user) redirect("/auth")

  return (
    <ToastProvider>
    <div className={d.layout}>
      <MevolutSidebar estateName={user.estate?.name ?? "My Estate"} userName={user.name ?? ""} />
      <div className={d.mainContent}>
        <div className={d.contentPanel}>
          <DashboardHeader estateName={user.estate?.name ?? "My Estate"} />
          <div className={d.contentPanelScroll}>
            {children}
            <div className={d.shellZone}>
              <div className={d.shellLeft} />
              <div className={d.shellRight}>
                <ShellZone />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </ToastProvider>
  )
}
