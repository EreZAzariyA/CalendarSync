import { notFound } from "next/navigation"
import { MeetingTypeShareView } from "@/components/share/meeting-type-share-view"
import { connectToDatabase } from "@/lib/mongodb"
import { User } from "@/lib/models/User"
import { getPublicMeetingType } from "@/lib/meeting-types"
import { normalizeUserSettings } from "@/lib/user-settings"

interface ShareMeetingTypePageProps {
  params: Promise<{
    token: string
    slug: string
  }>
}

export default async function ShareMeetingTypePage({ params }: ShareMeetingTypePageProps) {
  const { token, slug } = await params

  await connectToDatabase()
  const user = await User.findOne({ shareToken: token })
  if (!user) {
    notFound()
  }

  const meetingType = await getPublicMeetingType(user._id.toString(), slug)
  if (!meetingType) {
    notFound()
  }

  const settings = normalizeUserSettings(user.settings)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-background dark:via-background dark:to-background">
      <div className="container mx-auto px-4 py-8">
        <MeetingTypeShareView
          organizer={{ id: user._id.toString(), name: user.name, shareToken: token }}
          meetingType={meetingType}
          timeZone={settings.timezone}
        />
      </div>
    </div>
  )
}
