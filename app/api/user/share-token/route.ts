import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { User } from "@/lib/models/User"

export async function GET(request: NextRequest) {
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

    return NextResponse.json({ shareToken: user.shareToken })
  } catch (error) {
    console.error("Failed to fetch share token:", error)
    return NextResponse.json({ error: "Failed to fetch share token" }, { status: 500 })
  }
}
