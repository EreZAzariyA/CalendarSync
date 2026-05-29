import { MeetingTypeShareView } from "@/components/share/meeting-type-share-view"
import { ShareEntryView } from "@/components/share/share-entry-view"
import { connectToDatabase } from "@/lib/mongodb"
import { User } from "@/lib/models/User"
import { getActiveMeetingTypesForUser } from "@/lib/meeting-types"
import { normalizeUserSettings } from "@/lib/user-settings"
import { notFound } from "next/navigation"

interface SharePageProps {
  params: Promise<{
    token: string
  }>
}

export default async function SharePage({ params }: SharePageProps) {
  const { token } = await params

  // Look up user by shareToken
  await connectToDatabase()
  const user = await User.findOne({ shareToken: token })

  if (!user) {
    notFound()
  }

  const meetingTypes = await getActiveMeetingTypesForUser(user)
  const settings = normalizeUserSettings(user.settings)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-background dark:via-background dark:to-background">
      <div className="container mx-auto px-4 py-8">
        {meetingTypes.length === 1 ? (
          <MeetingTypeShareView
            organizer={{ id: user._id.toString(), name: user.name, shareToken: token }}
            meetingType={meetingTypes[0]}
            timeZone={settings.timezone}
          />
        ) : (
          <ShareEntryView organizerName={user.name} shareToken={token} meetingTypes={meetingTypes} />
        )}
      </div>
    </div>
  )
}
