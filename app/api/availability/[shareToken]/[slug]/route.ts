import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { User } from "@/lib/models/User"
import { GoogleCalendarClient } from "@/lib/google-calendar"
import { getPublicMeetingType } from "@/lib/meeting-types"
import { generateAvailableSlots } from "@/lib/availability"
import { normalizeUserSettings } from "@/lib/user-settings"

interface RouteContext {
  params: Promise<{
    shareToken: string
    slug: string
  }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { shareToken, slug } = await context.params
    const timeMin = request.nextUrl.searchParams.get("timeMin")
    const timeMax = request.nextUrl.searchParams.get("timeMax")

    if (!timeMin || !timeMax) {
      return NextResponse.json({ error: "timeMin and timeMax are required" }, { status: 400 })
    }

    const start = new Date(timeMin)
    const end = new Date(timeMax)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
      return NextResponse.json({ error: "Invalid date range" }, { status: 400 })
    }

    await connectToDatabase()
    const user = await User.findOne({ shareToken })
    if (!user) {
      return NextResponse.json({ error: "Invalid share link" }, { status: 404 })
    }

    const meetingType = await getPublicMeetingType(user._id.toString(), slug)
    if (!meetingType) {
      return NextResponse.json({ error: "Meeting type not found" }, { status: 404 })
    }

    if (!user.accessToken || (user.tokenExpiresAt && user.tokenExpiresAt < new Date())) {
      return NextResponse.json({ error: "Calendar access token expired" }, { status: 403 })
    }

    const calendarClient = new GoogleCalendarClient(user.accessToken)
    const freeBusyData = await calendarClient.getFreeBusy(start.toISOString(), end.toISOString())
    const slots = await generateAvailableSlots({
      organizerId: user._id.toString(),
      settings: normalizeUserSettings(user.settings),
      meetingType,
      busy: freeBusyData.primary?.busy || [],
      timeMin: start,
      timeMax: end,
    })

    return NextResponse.json({ slots })
  } catch (error) {
    console.error("Failed to fetch public availability:", error)
    return NextResponse.json({ error: "Failed to fetch availability" }, { status: 500 })
  }
}
