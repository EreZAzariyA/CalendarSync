import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { getServerSession } from "@/lib/auth"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { getMeetingTypesByOwner } from "@/lib/meeting-types"
import { MeetingTypesManager } from "@/components/meeting-types/meeting-types-manager"
import { connectToDatabase } from "@/lib/mongodb"
import { User } from "@/lib/models/User"

export default async function MeetingTypesPage() {
  const session = await getServerSession()

  if (!session) {
    redirect("/auth/signin")
  }

  await connectToDatabase()
  const user = await User.findById(session.user.id).lean()
  const [meetingTypes, t] = await Promise.all([
    getMeetingTypesByOwner(session.user.id, true),
    getTranslations("meetingTypes"),
  ])

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader user={session.user} />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>
        </div>
        <MeetingTypesManager initialMeetingTypes={meetingTypes} shareToken={user?.shareToken || ""} />
      </main>
    </div>
  )
}
