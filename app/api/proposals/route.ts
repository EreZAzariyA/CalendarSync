import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import { createProposal, getProposalsByOrganizer } from "@/lib/proposals"
import { connectToDatabase } from "@/lib/mongodb"
import { Proposal } from "@/lib/models/Proposal"
import { User } from "@/lib/models/User"
import { MeetingType } from "@/lib/models/MeetingType"
import { Booking } from "@/lib/models/Booking"
import { createMeetingEvent } from "@/lib/calendar-events"
import { sendProposalReceivedEmail, sendProposalDecisionEmail } from "@/lib/email"
import { GoogleCalendarClient } from "@/lib/google-calendar"
import { generateAvailableSlots, hasExactSlot } from "@/lib/availability"
import { formatMessage, getStaticMessages } from "@/lib/i18n-static"
import { toMeetingTypeDTO } from "@/lib/meeting-types"
import { normalizeUserSettings } from "@/lib/user-settings"
import { normalizeAnswers, validateAnswers } from "@/lib/scheduling"

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: NextRequest) {
  const locale = request.cookies.get("NEXT_LOCALE")?.value
  try {
    const body = await request.json()
    const { organizerId, organizerName, proposerName, proposerEmail, proposedSlots, meetingTypeId } = body

    // Validate required fields
    if (!organizerId || !proposerName || !proposerEmail || !proposedSlots || proposedSlots.length === 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Validate email format
    if (!EMAIL_REGEX.test(proposerEmail)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
    }

    // Validate proposer name length
    if (proposerName.length < 2 || proposerName.length > 100) {
      return NextResponse.json({ error: "Name must be between 2 and 100 characters" }, { status: 400 })
    }

    // Validate number of proposed slots (max 5)
    if (proposedSlots.length > 5) {
      return NextResponse.json({ error: "Maximum 5 time slots allowed" }, { status: 400 })
    }

    // Basic rate limiting: Check for recent proposals from same email
    // Limit to 5 proposals per email per day
    await connectToDatabase()
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const recentProposals = await Proposal.countDocuments({
      proposerEmail,
      createdAt: { $gte: oneDayAgo }
    })

    if (recentProposals >= 5) {
      return NextResponse.json({
        error: "Rate limit exceeded. Maximum 5 proposals per day per email."
      }, { status: 429 })
    }

    // NOTE: For production deployment, consider implementing:
    // - IP-based rate limiting using libraries like @upstash/ratelimit
    // - CAPTCHA verification to prevent automated spam
    // - Redis-based distributed rate limiting for scalability

    // Look up the organizer to read their settings. Tolerate a missing/legacy
    // organizerId (e.g. a non-ObjectId) without failing proposal creation.
    let organizer = null
    try {
      organizer = await User.findById(organizerId)
    } catch {
      organizer = null
    }

    if (!organizer) {
      return NextResponse.json({ error: "Organizer not found" }, { status: 404 })
    }

    const slots = proposedSlots.map((slot: string) => new Date(slot))
    const settings = normalizeUserSettings(organizer.settings)
    const timeZone = settings.timezone
    const organizerLocale = organizer.settings?.locale || locale
    const calendarCopy = getStaticMessages(organizerLocale).calendarEvent
    const meetingTypeDoc = meetingTypeId ? await MeetingType.findOne({ _id: meetingTypeId, ownerId: organizer._id.toString(), active: true }) : null
    const meetingType = meetingTypeDoc ? toMeetingTypeDTO(meetingTypeDoc) : null

    if (meetingTypeId && !meetingType) {
      return NextResponse.json({ error: "Meeting type not found" }, { status: 404 })
    }

    if (meetingType && meetingType.bookingMode !== "proposal") {
      return NextResponse.json({ error: "This meeting type does not accept proposals" }, { status: 400 })
    }

    const answers = meetingType ? normalizeAnswers(meetingType.customQuestions, body.answers || []) : []
    const answerErrors = meetingType ? validateAnswers(meetingType.customQuestions, answers) : {}
    if (Object.keys(answerErrors).length > 0) {
      return NextResponse.json({ error: "Missing required answers", details: answerErrors }, { status: 400 })
    }

    if (meetingType && organizer.accessToken) {
      const rangeStart = new Date(Math.min(...slots.map((slot: Date) => slot.getTime())))
      const rangeEnd = new Date(Math.max(...slots.map((slot: Date) => slot.getTime())))
      rangeStart.setDate(rangeStart.getDate() - 1)
      rangeEnd.setDate(rangeEnd.getDate() + 1)
      const calendarClient = new GoogleCalendarClient(organizer.accessToken)
      const freeBusyData = await calendarClient.getFreeBusy(rangeStart.toISOString(), rangeEnd.toISOString())
      const availableSlots = await generateAvailableSlots({
        organizerId: organizer._id.toString(),
        settings,
        meetingType,
        busy: freeBusyData.primary?.busy || [],
        timeMin: rangeStart,
        timeMax: rangeEnd,
      })

      if (slots.some((slot: Date) => !hasExactSlot(availableSlots, slot))) {
        return NextResponse.json({ error: "One or more selected times are no longer available" }, { status: 409 })
      }
    }

    // Auto-accept: if the organizer enabled it and exactly one slot was
    // proposed, confirm it immediately and create the calendar event.
    const autoAccept = Boolean(settings.autoAcceptMeetings) && slots.length === 1

    let calendarEventId: string | undefined
    if (autoAccept && organizer) {
      try {
        const event = await createMeetingEvent({
          accessToken: organizer.accessToken,
          proposerName,
          proposerEmail,
          slot: slots[0],
          durationMinutes: meetingType?.durationMinutes || settings.defaultMeetingDuration,
          timeZone,
          summary: formatMessage(calendarCopy.summaryWithName, {
            title: meetingType?.title || calendarCopy.defaultTitle,
            name: proposerName,
          }),
          location: meetingType?.location,
          locale: organizerLocale,
        })
        calendarEventId = event.id
      } catch (eventError) {
        console.error("Auto-accept calendar event creation failed:", eventError)
      }
    }

    const proposal = await createProposal({
      organizerId,
      organizerName: organizer.name || organizerName,
      meetingTypeId: meetingType?.id,
      meetingTypeTitle: meetingType?.title,
      durationMinutes: meetingType?.durationMinutes || settings.defaultMeetingDuration,
      proposerName,
      proposerEmail,
      proposedSlots: slots,
      answers,
      ...(autoAccept ? { status: "accepted" as const, selectedSlot: slots[0], calendarEventId } : {}),
    })

    if (autoAccept) {
      await Booking.create({
        organizerId: organizer._id.toString(),
        organizerName: organizer.name || organizerName,
        meetingTypeId: meetingType?.id,
        meetingTypeTitle: meetingType?.title || calendarCopy.defaultTitle,
        inviteeName: proposerName,
        inviteeEmail: proposerEmail,
        attendees: [{ name: proposerName, email: proposerEmail }],
        answers,
        start: slots[0],
        end: new Date(slots[0].getTime() + (meetingType?.durationMinutes || settings.defaultMeetingDuration) * 60 * 1000),
        timeZone,
        location: meetingType?.location,
        status: "confirmed",
        source: "proposal",
        sourceId: proposal.id,
        calendarEventId,
      })
    }

    // Notify the organizer of a new proposal (best-effort). Skipped when
    // auto-accepted — Google sends a calendar invite in that case.
    if (organizer.email && settings.emailNotifications && !autoAccept) {
      void sendProposalReceivedEmail({
        to: organizer.email,
        organizerName: organizer.name || organizerName,
        proposerName,
        proposerEmail,
        slots,
        timeZone,
        locale: organizerLocale,
      })
    }

    // Confirm to the proposer immediately on auto-accept.
    if (autoAccept) {
      void sendProposalDecisionEmail({
        to: proposerEmail,
        proposerName,
        organizerName: organizer.name || organizerName,
        status: "accepted",
        selectedSlot: slots[0],
        timeZone,
        locale,
      })
    }

    return NextResponse.json({ proposal, autoAccepted: autoAccept })
  } catch (error) {
    console.error("Failed to create proposal:", error)
    return NextResponse.json({ error: "Failed to create proposal" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const session = await getServerSession()

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const proposals = await getProposalsByOrganizer(session.user.id)
    
    return NextResponse.json({ proposals })
  } catch (error) {
    console.error("Failed to fetch proposals:", error)
    return NextResponse.json({ error: "Failed to fetch proposals" }, { status: 500 })
  }
}
