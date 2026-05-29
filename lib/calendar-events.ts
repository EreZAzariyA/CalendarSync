import { GoogleCalendarClient } from "@/lib/google-calendar"
import { formatMessage, getStaticMessages } from "@/lib/i18n-static"

export interface CreateMeetingEventInput {
  accessToken: string
  proposerName: string
  proposerEmail: string
  slot: Date
  durationMinutes: number
  timeZone: string
  summary?: string
  description?: string
  location?: string
  attendees?: Array<{ email: string }>
  locale?: string | null
}

/**
 * Creates a Google Calendar event for an accepted meeting proposal on the
 * organizer's primary calendar. Shared by the manual-accept (PATCH) and
 * auto-accept (POST) flows so both honour the organizer's saved preferences.
 *
 * Throws on API failure; callers treat event creation as best-effort.
 */
export async function createMeetingEvent({
  accessToken,
  proposerName,
  proposerEmail,
  slot,
  durationMinutes,
  timeZone,
  summary,
  description,
  location,
  attendees,
  locale,
}: CreateMeetingEventInput): Promise<{ id: string }> {
  const start = new Date(slot)
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000)
  const eventAttendees = attendees && attendees.length > 0 ? attendees : [{ email: proposerEmail }]
  const copy = getStaticMessages(locale).calendarEvent

  const client = new GoogleCalendarClient(accessToken)
  const event = await client.createEvent("primary", {
    summary: summary || formatMessage(copy.defaultSummary, { name: proposerName }),
    description: description || formatMessage(copy.defaultDescription, { name: proposerName, email: proposerEmail }),
    location,
    start: { dateTime: start.toISOString(), timeZone },
    end: { dateTime: end.toISOString(), timeZone },
    attendees: eventAttendees,
    reminders: {
      useDefault: false,
      overrides: [
        { method: "email", minutes: 24 * 60 },
        { method: "popup", minutes: 30 },
      ],
    },
  })

  return { id: event.id }
}
