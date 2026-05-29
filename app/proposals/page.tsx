import { redirect } from "next/navigation"
import { getServerSession } from "@/lib/auth"
import { getUserSettings } from "@/lib/user-settings"
import { getTranslations } from "next-intl/server"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { ProposalsList } from "@/components/proposals/proposals-list"

export default async function ProposalsPage() {
  const session = await getServerSession()

  if (!session) {
    redirect("/auth/signin")
  }

  const [{ timezone }, t] = await Promise.all([
    getUserSettings(session.user.id),
    getTranslations("proposals"),
  ])

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader user={session.user} />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground mt-2">{t("subtitle")}</p>
        </div>
        <ProposalsList timezone={timezone} />
      </main>
    </div>
  )
}
