import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import { duplicateMeetingType } from "@/lib/meeting-types"

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  const session = await getServerSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params
  const meetingType = await duplicateMeetingType(session.user.id, id, request.cookies.get("NEXT_LOCALE")?.value)
  if (!meetingType) {
    return NextResponse.json({ error: "Meeting type not found" }, { status: 404 })
  }

  return NextResponse.json({ meetingType }, { status: 201 })
}
