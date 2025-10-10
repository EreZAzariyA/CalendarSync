import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { User } from "@/lib/models/User"

export async function POST(request: NextRequest) {
  const session = await getServerSession()

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    await connectToDatabase()
    const user = await User.findById(session.user.id)

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Generate shareToken if it doesn't exist
    if (!user.shareToken) {
      user.shareToken = Math.random().toString(36).substring(2) + Date.now().toString(36)
      await user.save()
    }

    return NextResponse.json({
      success: true,
      shareToken: user.shareToken
    })
  } catch (error) {
    console.error("Failed to fix share token:", error)
    return NextResponse.json({ error: "Failed to fix share token" }, { status: 500 })
  }
}
