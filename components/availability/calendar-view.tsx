"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Calendar, ChevronLeft, ChevronRight, Loader2, Clock, ExternalLink, Users, AlignLeft } from "lucide-react"
import { format, startOfWeek, addDays, isSameDay, parseISO } from "date-fns"
import type { CalendarEvent } from "@/lib/google-calendar"
import { getDateFnsLocale } from "@/lib/date-locale"
import { formatInTimeZone } from "@/lib/format"
import { useLocale, useTranslations } from "next-intl"

interface CalendarViewProps {
  timezone: string
}

export function CalendarView({ timezone }: CalendarViewProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }))
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const t = useTranslations("availability")
  const locale = useLocale()
  const dateLocale = getDateFnsLocale(locale)

  useEffect(() => {
    fetchEvents()
  }, [currentWeekStart])

  const fetchEvents = async () => {
    setIsLoading(true)
    try {
      const timeMin = currentWeekStart.toISOString()
      const timeMax = addDays(currentWeekStart, 7).toISOString()
      const response = await fetch(`/api/calendar/events?timeMin=${timeMin}&timeMax=${timeMax}`)
      const data = await response.json()
      if (data.events) setEvents(data.events)
    } catch {
      console.error("Failed to fetch events")
    } finally {
      setIsLoading(false)
    }
  }

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i))

  const getEventsForDay = (day: Date) =>
    events.filter((event) => {
      const eventStart = event.start.dateTime ? parseISO(event.start.dateTime) : parseISO(event.start.date!)
      return isSameDay(eventStart, day)
    })

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {t("weekOf", { date: format(currentWeekStart, "PPP", { locale: dateLocale }) })}
              </CardTitle>
              <CardDescription>{t("googleCalendarEvents")}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }))}>
                {t("today")}
              </Button>
              <Button variant="outline" size="icon" onClick={() => setCurrentWeekStart(addDays(currentWeekStart, -7))}>
                <ChevronLeft className={`h-4 w-4 ${locale === "he" ? "rotate-180" : ""}`} />
              </Button>
              <Button variant="outline" size="icon" onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))}>
                <ChevronRight className={`h-4 w-4 ${locale === "he" ? "rotate-180" : ""}`} />
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href="https://calendar.google.com" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 me-2" />
                  {t("openInGoogle")}
                </a>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-7">
              {weekDays.map((day) => {
                const dayEvents = getEventsForDay(day)
                const isToday = isSameDay(day, new Date())

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDay(day)}
                    className={`rounded-lg border p-4 text-start transition-colors hover:bg-accent/50 cursor-pointer ${
                      isToday ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <div className="mb-3">
                      <div className="text-xs font-medium text-muted-foreground uppercase">{format(day, "EEE", { locale: dateLocale })}</div>
                      <div className={`text-2xl font-bold ${isToday ? "text-primary" : ""}`}>{format(day, "d")}</div>
                    </div>
                    <div className="space-y-2">
                      {dayEvents.length === 0 ? (
                        <div className="text-xs text-muted-foreground">{t("noEvents")}</div>
                      ) : (
                        dayEvents.map((event) => (
                          <div key={event.id} className="rounded-md bg-primary/10 p-2 text-xs border border-primary/20">
                            <div className="font-medium text-primary line-clamp-2">{event.summary}</div>
                            {event.start.dateTime && (
                              <div className="mt-1 flex items-center gap-1 text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {formatInTimeZone(event.start.dateTime, timezone, { hour: "numeric", minute: "2-digit" }, locale)}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                      {dayEvents.length > 0 && (
                        <div className="text-xs text-primary/70 font-medium pt-1">{t("tapForDetails")}</div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("upcomingEvents")}</CardTitle>
          <CardDescription>{t("nextEvents")}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">{t("noEventsThisWeek")}</div>
          ) : (
            <div className="space-y-3">
              {events.slice(0, 5).map((event) => (
                <div key={event.id} className="flex items-start gap-4 rounded-lg border p-4">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm">{event.summary}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {event.start.dateTime
                        ? formatInTimeZone(event.start.dateTime, timezone, {
                            weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit",
                          }, locale)
                        : format(parseISO(event.start.date!), "PPPP", { locale: dateLocale })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Day-detail modal */}
      <Dialog open={!!selectedDay} onOpenChange={(open) => !open && setSelectedDay(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              {selectedDay && format(selectedDay, "PPPP", { locale: dateLocale })}
            </DialogTitle>
            <DialogDescription>
              {selectedDay && (() => {
                const count = getEventsForDay(selectedDay).length
                return count === 0
                  ? t("noEventsScheduled")
                  : count === 1
                    ? t("eventCount", { count, timezone })
                    : t("eventCountPlural", { count, timezone })
              })()}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 space-y-3 max-h-[60vh] overflow-y-auto pe-1">
            {selectedDay && getEventsForDay(selectedDay).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                <Calendar className="h-10 w-10 opacity-30" />
                <p className="text-sm">{t("noEventsEmpty")}</p>
              </div>
            ) : (
              selectedDay &&
              getEventsForDay(selectedDay).map((event) => {
                const startDT = event.start.dateTime
                const endDT = event.end.dateTime
                const isAllDay = !startDT

                return (
                  <div key={event.id} className="rounded-lg border border-border p-4 space-y-2 hover:bg-accent/30 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-sm leading-snug">{event.summary || t("noTitle")}</h3>
                      {isAllDay ? (
                        <Badge variant="secondary" className="shrink-0 text-xs">{t("allDay")}</Badge>
                      ) : (
                        <Badge variant="outline" className="shrink-0 text-xs font-normal">{event.status}</Badge>
                      )}
                    </div>

                    {!isAllDay && startDT && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4 shrink-0" />
                        <span>
                          {formatInTimeZone(startDT, timezone, { hour: "numeric", minute: "2-digit" }, locale)}
                          {endDT && <>{" – "}{formatInTimeZone(endDT, timezone, { hour: "numeric", minute: "2-digit" }, locale)}</>}
                        </span>
                      </div>
                    )}

                    {event.description && (
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <AlignLeft className="h-4 w-4 shrink-0 mt-0.5" />
                        <p className="line-clamp-3 whitespace-pre-line">{event.description}</p>
                      </div>
                    )}

                    {event.attendees && event.attendees.length > 0 && (
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4 shrink-0 mt-0.5" />
                        <div className="flex flex-wrap gap-1">
                          {event.attendees.map((a) => (
                            <span key={a.email} className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs">
                              {a.email}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
