import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { connectToDatabase } from "@/lib/mongodb"
import { User } from "@/lib/models/User"
import { Booking } from "@/lib/models/Booking"
import { MeetingType } from "@/lib/models/MeetingType"
import { GoogleCalendarClient } from "@/lib/google-calendar"
import { createMeetingEvent } from "@/lib/calendar-events"
import { generateAvailableSlots, hasExactSlot } from "@/lib/availability"
import { formatMessage, getStaticMessages } from "@/lib/i18n-static"
import { toMeetingTypeDTO } from "@/lib/meeting-types"
import { normalizeUserSettings } from "@/lib/user-settings"
import { normalizeAnswers, validateAnswers } from "@/lib/scheduling"
import { sendBookingConfirmationEmail, sendOrganizerBookingEmail } from "@/lib/email"

const bookingSchema = z.object({
  meetingTypeId: z.string().min(1),
  startTime: z.string().datetime(),
  inviteeName: z.string().min(2).max(100),
  inviteeEmail: z.string().email(),
  answers: z
    .array(
      z.object({
        questionId: z.string(),
        label: z.string(),
        value: z.string(),
      }),
    )
    .optional(),
})

export async function POST(request: NextRequest) {
  const locale = request.cookies.get("NEXT_LOCALE")?.value
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = bookingSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid booking", details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  try {
    await connectToDatabase()
    const meetingTypeDoc = await MeetingType.findById(parsed.data.meetingTypeId)
    if (!meetingTypeDoc || !meetingTypeDoc.active || meetingTypeDoc.bookingMode !== "direct") {
      return NextResponse.json({ error: "Meeting type is not available for direct booking" }, { status: 404 })
    }

    const organizer = await User.findById(meetingTypeDoc.ownerId)
    if (!organizer) {
      return NextResponse.json({ error: "Organizer not found" }, { status: 404 })
    }

    const meetingType = toMeetingTypeDTO(meetingTypeDoc)
    const settings = normalizeUserSettings(organizer.settings)
    const organizerLocale = organizer.settings?.locale || locale
    const calendarCopy = getStaticMessages(organizerLocale).calendarEvent
    const answers = normalizeAnswers(meetingType.customQuestions, parsed.data.answers || [])
    const answerErrors = validateAnswers(meetingType.customQuestions, answers)
    if (Object.keys(answerErrors).length > 0) {
      return NextResponse.json({ error: "Missing required answers", details: answerErrors }, { status: 400 })
    }

    if (!organizer.accessToken || (organizer.tokenExpiresAt && organizer.tokenExpiresAt < new Date())) {
      return NextResponse.json({ error: "Calendar access token expired" }, { status: 403 })
    }

    const requestedStart = new Date(parsed.data.startTime)
    const availabilityStart = new Date(requestedStart)
    availabilityStart.setDate(availabilityStart.getDate() - 1)
    const availabilityEnd = new Date(requestedStart)
    availabilityEnd.setDate(availabilityEnd.getDate() + 1)

    const calendarClient = new GoogleCalendarClient(organizer.accessToken)
    const freeBusyData = await calendarClient.getFreeBusy(availabilityStart.toISOString(), availabilityEnd.toISOString())
    const availableSlots = await generateAvailableSlots({
      organizerId: organizer._id.toString(),
      settings,
      meetingType,
      busy: freeBusyData.primary?.busy || [],
      timeMin: availabilityStart,
      timeMax: availabilityEnd,
    })

    if (!hasExactSlot(availableSlots, requestedStart)) {
      return NextResponse.json({ error: "This time is no longer available" }, { status: 409 })
    }

    const end = new Date(requestedStart.getTime() + meetingType.durationMinutes * 60 * 1000)
    const event = await createMeetingEvent({
      accessToken: organizer.accessToken,
      proposerName: parsed.data.inviteeName,
      proposerEmail: parsed.data.inviteeEmail,
      slot: requestedStart,
      durationMinutes: meetingType.durationMinutes,
      timeZone: settings.timezone,
      summary: formatMessage(calendarCopy.summaryWithName, { title: meetingType.title, name: parsed.data.inviteeName }),
      description: [
        calendarCopy.directDescriptionIntro,
        formatMessage(calendarCopy.meetingTypeLine, { title: meetingType.title }),
        formatMessage(calendarCopy.attendeeLine, { name: parsed.data.inviteeName, email: parsed.data.inviteeEmail }),
        ...answers.map((answer) => `${answer.label}: ${answer.value}`),
      ].join("\n"),
      location: meetingType.location,
      locale: organizerLocale,
    })

    const booking = await Booking.create({
      organizerId: organizer._id.toString(),
      organizerName: organizer.name,
      meetingTypeId: meetingType.id,
      meetingTypeTitle: meetingType.title,
      inviteeName: parsed.data.inviteeName,
      inviteeEmail: parsed.data.inviteeEmail,
      attendees: [{ name: parsed.data.inviteeName, email: parsed.data.inviteeEmail }],
      answers,
      start: requestedStart,
      end,
      timeZone: settings.timezone,
      location: meetingType.location,
      status: "confirmed",
      source: "direct",
      calendarEventId: event.id,
    })

    void sendBookingConfirmationEmail({
      to: parsed.data.inviteeEmail,
      name: parsed.data.inviteeName,
      organizerName: organizer.name,
      meetingTitle: meetingType.title,
      slot: requestedStart,
      timeZone: settings.timezone,
      location: meetingType.location,
      locale,
    })

    if (organizer.email && organizer.settings?.emailNotifications) {
      void sendOrganizerBookingEmail({
        to: organizer.email,
        organizerName: organizer.name,
        inviteeName: parsed.data.inviteeName,
        inviteeEmail: parsed.data.inviteeEmail,
        meetingTitle: meetingType.title,
        slot: requestedStart,
        timeZone: settings.timezone,
        locale: organizerLocale,
      })
    }

    return NextResponse.json({ booking: { id: booking._id.toString(), start: booking.start, end: booking.end } }, { status: 201 })
  } catch (error) {
    console.error("Failed to create booking:", error)
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 })
  }
}
