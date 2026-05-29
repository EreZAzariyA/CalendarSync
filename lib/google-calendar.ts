import type { User } from "@/lib/auth"

export interface CalendarEvent {
  id: string
  summary: string
  start: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  end: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  status: string
  description?: string
  location?: string
  attendees?: Array<{ email: string }>
  reminders?: {
    useDefault: boolean
    overrides?: Array<{ method: string; minutes: number }>
  }
}

export interface FreeBusyPeriod {
  start: string
  end: string
}

export interface CalendarFreeBusy {
  busy: FreeBusyPeriod[]
}

export class GoogleCalendarClient {
  private accessToken: string

  constructor(accessToken: string) {
    this.accessToken = accessToken
  }

  private async fetch(url: string, options: RequestInit = {}) {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const error = await response.text()

      // Check for authentication errors
      if (response.status === 401) {
        throw new Error("Google Calendar authentication failed. Please sign in again.")
      }

      // Check for forbidden/permission errors
      if (response.status === 403) {
        throw new Error("Google Calendar permission denied. Please check your calendar permissions.")
      }

      // Check for rate limiting
      if (response.status === 429) {
        throw new Error("Google Calendar API rate limit exceeded. Please try again later.")
      }

      throw new Error(`Google Calendar API error: ${response.status} - ${error}`)
    }

    return response.json()
  }

  async listCalendars() {
    return this.fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList")
  }

  async getEvents(calendarId = "primary", timeMin?: string, timeMax?: string) {
    const params = new URLSearchParams({
      calendarId,
      singleEvents: "true",
      orderBy: "startTime",
    })

    if (timeMin) params.append("timeMin", timeMin)
    if (timeMax) params.append("timeMax", timeMax)

    const data = await this.fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
    )

    return data.items as CalendarEvent[]
  }

  async getFreeBusy(timeMin: string, timeMax: string, calendarIds: string[] = ["primary"]) {
    const data = await this.fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
      method: "POST",
      body: JSON.stringify({
        timeMin,
        timeMax,
        items: calendarIds.map((id) => ({ id })),
      }),
    })

    return data.calendars as Record<string, CalendarFreeBusy>
  }

  async createEvent(
    calendarId = "primary",
    event: Partial<CalendarEvent> & {
      description?: string
      attendees?: Array<{ email: string }>
      reminders?: {
        useDefault: boolean
        overrides?: Array<{ method: string; minutes: number }>
      }
    },
  ) {
    return this.fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
      method: "POST",
      body: JSON.stringify(event),
    })
  }
}

export function createCalendarClient(user: User) {
  return new GoogleCalendarClient(user.accessToken)
}
