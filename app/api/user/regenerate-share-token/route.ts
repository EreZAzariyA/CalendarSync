import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { User } from "@/lib/models/User"
import { randomBytes } from "crypto"

export async function POST(request: NextRequest) {
  const session = await getServerSession()

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    await connectToDatabase()

    // Generate new cryptographically secure token
    const newToken = randomBytes(32).toString('hex')

    const user = await User.findByIdAndUpdate(
      session.user.id,
      { shareToken: newToken },
      { new: true },
    )

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ shareToken: user.shareToken })
  } catch (error) {
    console.error("Failed to regenerate share token:", error)
    return NextResponse.json({ error: "Failed to regenerate share token" }, { status: 500 })
  }
}
