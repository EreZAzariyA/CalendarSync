import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import { createCalendarClient } from "@/lib/google-calendar"

export async function GET(request: NextRequest) {
  const session = await getServerSession()

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const timeMin = searchParams.get("timeMin")
  const timeMax = searchParams.get("timeMax")

  try {
    const calendarClient = createCalendarClient(session.user)
    const events = await calendarClient.getEvents(
      "primary",
      timeMin || new Date().toISOString(),
      timeMax || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    )

    return NextResponse.json({ events })
  } catch (error) {
    console.error("Failed to fetch calendar events:", error)
    return NextResponse.json({ error: "Failed to fetch calendar events" }, { status: 500 })
  }
}
