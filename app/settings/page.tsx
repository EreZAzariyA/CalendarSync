import { redirect } from "next/navigation"
import { getServerSession } from "@/lib/auth"
import { getUserSettings } from "@/lib/user-settings"
import { getTranslations } from "next-intl/server"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { SettingsView } from "@/components/settings/settings-view"

export default async function SettingsPage() {
  const session = await getServerSession()

  if (!session) {
    redirect("/auth/signin")
  }

  const [initialSettings, t] = await Promise.all([
    getUserSettings(session.user.id),
    getTranslations("settings"),
  ])

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader user={session.user} />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground mt-2">{t("subtitle")}</p>
        </div>
        <SettingsView initialSettings={initialSettings} />
      </main>
    </div>
  )
}
