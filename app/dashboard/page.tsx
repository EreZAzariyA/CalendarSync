import { redirect } from "next/navigation"
import { getServerSession } from "@/lib/auth"
import { getTranslations } from "next-intl/server"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { AvailabilityCard } from "@/components/dashboard/availability-card"
import { ShareLinkCard } from "@/components/dashboard/share-link-card"
import { UpcomingMeetingsCard } from "@/components/dashboard/upcoming-meetings-card"

export default async function DashboardPage() {
  const session = await getServerSession()

  if (!session) {
    redirect("/auth/signin")
  }

  const t = await getTranslations("dashboard")

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader user={session.user} />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">{t("welcome", { name: session.user.name })}</h1>
          <p className="text-muted-foreground mt-2">{t("subtitle")}</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <AvailabilityCard />
          <ShareLinkCard userId={session.user.id} userName={session.user.name} />
          <UpcomingMeetingsCard />
        </div>
      </main>
    </div>
  )
}
