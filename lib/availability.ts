import { addDays, addMinutes, startOfDay } from "date-fns"
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz"
import { Booking } from "@/lib/models/Booking"
import type { FreeBusyPeriod } from "@/lib/google-calendar"
import type { MeetingTypeDTO } from "@/lib/meeting-types"
import { normalizeAvailabilityRules, type AvailabilityRules } from "@/lib/scheduling"
import type { IUserSettings } from "@/lib/models/User"

export interface AvailableSlot {
  start: string
  end: string
}

interface GenerateSlotsInput {
  organizerId: string
  settings: IUserSettings
  meetingType: MeetingTypeDTO
  busy: FreeBusyPeriod[]
  timeMin: Date
  timeMax: Date
}

function parseTime(value: string) {
  const [hour, minute] = value.split(":").map(Number)
  return { hour: Number.isFinite(hour) ? hour : 0, minute: Number.isFinite(minute) ? minute : 0 }
}

function overlaps(startA: Date, endA: Date, startB: Date, endB: Date) {
  return startA < endB && endA > startB
}

function dayKey(date: Date, timeZone: string) {
  return formatInTimeZone(date, timeZone, "yyyy-MM-dd")
}

export function resolveMeetingRules(settings: IUserSettings, meetingType: MeetingTypeDTO): AvailabilityRules {
  return normalizeAvailabilityRules(settings.availability, meetingType.availabilityOverrides)
}

export async function generateAvailableSlots({
  organizerId,
  settings,
  meetingType,
  busy,
  timeMin,
  timeMax,
}: GenerateSlotsInput): Promise<AvailableSlot[]> {
  const rules = resolveMeetingRules(settings, meetingType)
  const timeZone = settings.timezone || "UTC"
  const now = new Date()
  const minStart = new Date(Math.max(timeMin.getTime(), addMinutes(now, rules.minNoticeMinutes).getTime()))
  const maxEnd = new Date(Math.min(timeMax.getTime(), addDays(now, rules.rollingWindowDays).getTime()))

  if (minStart >= maxEnd) return []

  const bookings = await Booking.find({
    organizerId,
    status: "confirmed",
    start: { $lt: maxEnd },
    end: { $gt: minStart },
  }).lean()

  const bookingsByDay = new Map<string, number>()
  bookings.forEach((booking) => {
    const key = dayKey(booking.start, timeZone)
    bookingsByDay.set(key, (bookingsByDay.get(key) || 0) + 1)
  })

  const blocked = [
    ...busy.map((period) => ({ start: new Date(period.start), end: new Date(period.end) })),
    ...bookings.map((booking) => ({ start: booking.start, end: booking.end })),
  ]

  const slots: AvailableSlot[] = []
  let cursor = startOfDay(toZonedTime(minStart, timeZone))
  const zonedEnd = toZonedTime(maxEnd, timeZone)
  const durationMs = meetingType.durationMinutes * 60 * 1000

  while (cursor <= zonedEnd) {
    if (rules.workingDays.includes(cursor.getDay())) {
      const key = formatInTimeZone(fromZonedTime(cursor, timeZone), timeZone, "yyyy-MM-dd")
      const dayBookings = bookingsByDay.get(key) || 0

      if (dayBookings < rules.maxBookingsPerDay) {
        const startTime = parseTime(rules.startTime)
        const endTime = parseTime(rules.endTime)
        const dayStart = new Date(cursor)
        dayStart.setHours(startTime.hour, startTime.minute, 0, 0)
        const dayEnd = new Date(cursor)
        dayEnd.setHours(endTime.hour, endTime.minute, 0, 0)

        for (
          let localSlot = new Date(dayStart);
          localSlot.getTime() + durationMs <= dayEnd.getTime();
          localSlot = addMinutes(localSlot, rules.slotIntervalMinutes)
        ) {
          const start = fromZonedTime(localSlot, timeZone)
          const end = new Date(start.getTime() + durationMs)

          if (start < minStart || end > maxEnd) continue

          const bufferedStart = addMinutes(start, -rules.bufferBeforeMinutes)
          const bufferedEnd = addMinutes(end, rules.bufferAfterMinutes)
          const isBlocked = blocked.some((period) => overlaps(bufferedStart, bufferedEnd, period.start, period.end))

          if (!isBlocked) {
            slots.push({ start: start.toISOString(), end: end.toISOString() })
          }
        }
      }
    }

    cursor = addDays(cursor, 1)
  }

  return slots
}

export function hasExactSlot(slots: AvailableSlot[], startTime: Date) {
  return slots.some((slot) => new Date(slot.start).getTime() === startTime.getTime())
}
