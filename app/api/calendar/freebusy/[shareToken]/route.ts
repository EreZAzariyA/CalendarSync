import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { User } from "@/lib/models/User"
import { GoogleCalendarClient } from "@/lib/google-calendar"

interface RouteParams {
  params: Promise<{
    shareToken: string
  }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { shareToken } = await params
    const searchParams = request.nextUrl.searchParams
    const timeMin = searchParams.get("timeMin")
    const timeMax = searchParams.get("timeMax")

    // Validate required parameters
    if (!timeMin || !timeMax) {
      return NextResponse.json({ error: "timeMin and timeMax are required" }, { status: 400 })
    }

    // Validate date format
    if (isNaN(Date.parse(timeMin)) || isNaN(Date.parse(timeMax))) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 })
    }

    // Look up user by shareToken (secure access control)
    await connectToDatabase()
    const user = await User.findOne({ shareToken })

    // Return 404 for invalid tokens (don't leak whether token exists)
    if (!user) {
      return NextResponse.json({ error: "Invalid share link" }, { status: 404 })
    }

    // Check if user has valid access token and verify token expiration
    if (!user.accessToken || (user.tokenExpiresAt && user.tokenExpiresAt < new Date())) {
      return NextResponse.json({
        error: "Calendar access token expired. User needs to re-authenticate."
      }, { status: 403 })
    }

    // Create Google Calendar client with user's access token
    const calendarClient = new GoogleCalendarClient(user.accessToken)

    // Fetch free/busy information
    const freeBusyData = await calendarClient.getFreeBusy(timeMin, timeMax)

    // Extract busy periods from primary calendar
    const busyPeriods = freeBusyData.primary?.busy || []

    return NextResponse.json({ busy: busyPeriods })
  } catch (error) {
    console.error("Failed to fetch free/busy data:", error)

    // Return more specific error messages
    if (error instanceof Error) {
      if (error.message.includes("authentication failed")) {
        return NextResponse.json(
          { error: "Calendar authentication expired. Please ask the user to sign in again." },
          { status: 401 }
        )
      }
      if (error.message.includes("permission denied")) {
        return NextResponse.json(
          { error: "Calendar access denied. Please check permissions." },
          { status: 403 }
        )
      }
    }

    return NextResponse.json(
      { error: "Failed to fetch availability data" },
      { status: 500 }
    )
  }
}
