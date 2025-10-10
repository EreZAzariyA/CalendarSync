import { ShareAvailabilityView } from "@/components/share/share-availability-view"
import { connectToDatabase } from "@/lib/mongodb"
import { User } from "@/lib/models/User"
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        <ShareAvailabilityView userId={user._id.toString()} userName={user.name} shareToken={token} />
      </div>
    </div>
  )
}
