import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getServerSession } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { Poll } from "@/lib/models/Poll"
import { Booking } from "@/lib/models/Booking"
import { User } from "@/lib/models/User"
import { MeetingType } from "@/lib/models/MeetingType"
import { createMeetingEvent } from "@/lib/calendar-events"
import { formatMessage, getStaticMessages } from "@/lib/i18n-static"
import { normalizeUserSettings } from "@/lib/user-settings"
import { toMeetingTypeDTO } from "@/lib/meeting-types"

interface RouteContext {
  params: Promise<{ id: string }>
}

const patchSchema = z.object({
  status: z.enum(["open", "finalized", "closed"]),
  selectedSlot: z.string().datetime().optional(),
})

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await getServerSession()
  const locale = request.cookies.get("NEXT_LOCALE")?.value
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid poll update", details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  await connectToDatabase()
  const { id } = await context.params
  const poll = await Poll.findOne({ _id: id, organizerId: session.user.id })
  if (!poll) {
    return NextResponse.json({ error: "Poll not found" }, { status: 404 })
  }

  if (parsed.data.status !== "finalized") {
    poll.status = parsed.data.status
    await poll.save()
    return NextResponse.json({ poll: { ...poll.toObject(), id: poll._id.toString(), _id: undefined } })
  }

  if (!parsed.data.selectedSlot) {
    return NextResponse.json({ error: "selectedSlot is required to finalize" }, { status: 400 })
  }

  const selectedSlot = new Date(parsed.data.selectedSlot)
  const candidateMatches = poll.candidateSlots.some((slot) => slot.getTime() === selectedSlot.getTime())
  if (!candidateMatches) {
    return NextResponse.json({ error: "Selected slot is not a poll candidate" }, { status: 400 })
  }

  const organizer = await User.findById(session.user.id)
  const meetingTypeDoc = await MeetingType.findById(poll.meetingTypeId)
  if (!organizer || !meetingTypeDoc) {
    return NextResponse.json({ error: "Organizer or meeting type not found" }, { status: 404 })
  }

  const settings = normalizeUserSettings(organizer.settings)
  const meetingType = toMeetingTypeDTO(meetingTypeDoc)
  const organizerLocale = organizer.settings?.locale || locale
  const calendarCopy = getStaticMessages(organizerLocale).calendarEvent
  const matchingVotes = poll.votes.filter((vote) =>
    vote.selectedSlots.some((slot) => slot.getTime() === selectedSlot.getTime()),
  )
  const attendees = matchingVotes.map((vote) => ({ email: vote.participantEmail }))

  const event = await createMeetingEvent({
    accessToken: organizer.accessToken,
    proposerName: calendarCopy.pollParticipants,
    proposerEmail: organizer.email,
    slot: selectedSlot,
    durationMinutes: meetingType.durationMinutes,
    timeZone: settings.timezone,
    summary: poll.title,
    description: formatMessage(calendarCopy.pollDescription, { description: poll.description || "" }),
    location: meetingType.location,
    attendees,
    locale: organizerLocale,
  })

  const end = new Date(selectedSlot.getTime() + meetingType.durationMinutes * 60 * 1000)
  const booking = await Booking.create({
    organizerId: organizer._id.toString(),
    organizerName: organizer.name,
    meetingTypeId: meetingType.id,
    meetingTypeTitle: meetingType.title,
    inviteeName: calendarCopy.pollParticipants,
    inviteeEmail: organizer.email,
    attendees: matchingVotes.map((vote) => ({ name: vote.participantName, email: vote.participantEmail })),
    answers: [],
    start: selectedSlot,
    end,
    timeZone: settings.timezone,
    location: meetingType.location,
    status: "confirmed",
    source: "poll",
    sourceId: poll._id.toString(),
    calendarEventId: event.id,
  })

  poll.status = "finalized"
  poll.selectedSlot = selectedSlot
  poll.bookingId = booking._id.toString()
  await poll.save()

  return NextResponse.json({ poll: { ...poll.toObject(), id: poll._id.toString(), _id: undefined } })
}
