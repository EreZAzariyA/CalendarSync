import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import { createCalendarClient } from "@/lib/google-calendar"

export async function POST(request: NextRequest) {
  const session = await getServerSession()

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { timeMin, timeMax, calendarIds } = body

    if (!timeMin || !timeMax) {
      return NextResponse.json({ error: "timeMin and timeMax are required" }, { status: 400 })
    }

    const calendarClient = createCalendarClient(session.user)
    const freeBusy = await calendarClient.getFreeBusy(timeMin, timeMax, calendarIds)

    return NextResponse.json({ freeBusy })
  } catch (error) {
    console.error("Failed to fetch free/busy data:", error)
    return NextResponse.json({ error: "Failed to fetch free/busy data" }, { status: 500 })
  }
}
