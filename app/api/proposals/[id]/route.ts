import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import { getProposal, updateProposal, type MeetingProposal } from "@/lib/proposals"
import { connectToDatabase } from "@/lib/mongodb"
import { User } from "@/lib/models/User"
import { Booking } from "@/lib/models/Booking"
import { createMeetingEvent } from "@/lib/calendar-events"
import { sendProposalDecisionEmail } from "@/lib/email"
import { formatMessage, getStaticMessages } from "@/lib/i18n-static"
import { normalizeUserSettings } from "@/lib/user-settings"

interface RouteContext {
  params: Promise<{
    id: string
  }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params

  try {
    const proposal = await getProposal(id)

    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 })
    }

    return NextResponse.json({ proposal })
  } catch (error) {
    console.error("Failed to fetch proposal:", error)
    return NextResponse.json({ error: "Failed to fetch proposal" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await getServerSession()
  const locale = request.cookies.get("NEXT_LOCALE")?.value

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params

  try {
    const body = await request.json()
    const proposal = await getProposal(id)

    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 })
    }

    // Check if user owns this proposal
    // organizerId might be MongoDB _id or old Google ID, so we need to check both
    await connectToDatabase()
    const currentUser = await User.findById(session.user.id)

    let isOwner = proposal.organizerId === session.user.id

    // If not a direct match, check if the organizerId is a Google ID that matches current user
    if (!isOwner && currentUser) {
      const proposalOwner = await User.findOne({ googleId: proposal.organizerId })
      if (proposalOwner && proposalOwner._id.toString() === session.user.id) {
        isOwner = true
      }
    }

    if (!isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const status: string | undefined = body.status
    const selectedSlot: Date | undefined = body.selectedSlot ? new Date(body.selectedSlot) : undefined
    const settings = normalizeUserSettings(currentUser?.settings)
    const timeZone = settings.timezone
    const organizerLocale = currentUser?.settings?.locale || locale
    const calendarCopy = getStaticMessages(organizerLocale).calendarEvent

    // On acceptance, create the Google Calendar event server-side using the
    // organizer's saved meeting duration + timezone. Best-effort: a calendar
    // failure must not block the proposal from being marked accepted.
    let calendarEventId: string | undefined
    let calendarEventCreated = false

    if (status === "accepted" && selectedSlot) {
      try {
        const event = await createMeetingEvent({
          accessToken: session.user.accessToken,
          proposerName: proposal.proposerName,
          proposerEmail: proposal.proposerEmail,
          slot: selectedSlot,
          durationMinutes: proposal.durationMinutes || settings.defaultMeetingDuration,
          timeZone,
          summary: formatMessage(calendarCopy.summaryWithName, {
            title: proposal.meetingTypeTitle || calendarCopy.defaultTitle,
            name: proposal.proposerName,
          }),
          locale: organizerLocale,
        })
        calendarEventId = event.id
        calendarEventCreated = true
      } catch (eventError) {
        console.error("Failed to create calendar event for accepted proposal:", eventError)
      }
    }

    const updates: Partial<Omit<MeetingProposal, "id">> = {}
    if (status) updates.status = status as MeetingProposal["status"]
    if (selectedSlot) updates.selectedSlot = selectedSlot
    if (calendarEventId) updates.calendarEventId = calendarEventId

    const updated = await updateProposal(id, updates)

    if (status === "accepted" && selectedSlot && updated) {
      const existingBooking = await Booking.findOne({ source: "proposal", sourceId: id })
      if (!existingBooking) {
        await Booking.create({
          organizerId: currentUser?._id.toString() || session.user.id,
          organizerName: proposal.organizerName,
          meetingTypeId: proposal.meetingTypeId,
          meetingTypeTitle: proposal.meetingTypeTitle || calendarCopy.defaultTitle,
          inviteeName: proposal.proposerName,
          inviteeEmail: proposal.proposerEmail,
          attendees: [{ name: proposal.proposerName, email: proposal.proposerEmail }],
          answers: proposal.answers || [],
          start: selectedSlot,
          end: new Date(selectedSlot.getTime() + (proposal.durationMinutes || settings.defaultMeetingDuration) * 60 * 1000),
          timeZone,
          status: "confirmed",
          source: "proposal",
          sourceId: id,
          calendarEventId,
        })
      }
    }

    // Notify the proposer of the decision (best-effort).
    if (status === "accepted" || status === "rejected") {
      void sendProposalDecisionEmail({
        to: proposal.proposerEmail,
        proposerName: proposal.proposerName,
        organizerName: proposal.organizerName,
        status,
        selectedSlot,
        timeZone,
        locale: organizerLocale,
      })
    }

    return NextResponse.json({ proposal: updated, calendarEventCreated })
  } catch (error) {
    console.error("Failed to update proposal:", error)
    return NextResponse.json({ error: "Failed to update proposal" }, { status: 500 })
  }
}
