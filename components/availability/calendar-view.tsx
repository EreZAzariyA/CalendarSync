"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, ChevronLeft, ChevronRight, Loader2, Clock, ExternalLink } from "lucide-react"
import { format, startOfWeek, addDays, isSameDay, parseISO } from "date-fns"
import type { CalendarEvent } from "@/lib/google-calendar"

export function CalendarView() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }))

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

      if (data.events) {
        setEvents(data.events)
      }
    } catch (error) {
      console.error("Failed to fetch events:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const goToPreviousWeek = () => {
    setCurrentWeekStart(addDays(currentWeekStart, -7))
  }

  const goToNextWeek = () => {
    setCurrentWeekStart(addDays(currentWeekStart, 7))
  }

  const goToToday = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }))
  }

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i))

  const getEventsForDay = (day: Date) => {
    return events.filter((event) => {
      const eventStart = event.start.dateTime ? parseISO(event.start.dateTime) : parseISO(event.start.date!)
      return isSameDay(eventStart, day)
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Week of {format(currentWeekStart, "MMMM d, yyyy")}
              </CardTitle>
              <CardDescription>Your Google Calendar events for this week</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
              <Button variant="outline" size="icon" onClick={goToPreviousWeek}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={goToNextWeek}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href="https://calendar.google.com" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in Google
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
                  <div
                    key={day.toISOString()}
                    className={`rounded-lg border p-4 ${isToday ? "border-primary bg-primary/5" : "border-border"}`}
                  >
                    <div className="mb-3">
                      <div className="text-xs font-medium text-muted-foreground uppercase">{format(day, "EEE")}</div>
                      <div className={`text-2xl font-bold ${isToday ? "text-primary" : ""}`}>{format(day, "d")}</div>
                    </div>
                    <div className="space-y-2">
                      {dayEvents.length === 0 ? (
                        <div className="text-xs text-muted-foreground">No events</div>
                      ) : (
                        dayEvents.map((event) => (
                          <div key={event.id} className="rounded-md bg-primary/10 p-2 text-xs border border-primary/20">
                            <div className="font-medium text-primary line-clamp-2">{event.summary}</div>
                            {event.start.dateTime && (
                              <div className="mt-1 flex items-center gap-1 text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {format(parseISO(event.start.dateTime), "h:mm a")}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming Events</CardTitle>
          <CardDescription>Your next scheduled events</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No upcoming events this week</div>
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
                        ? format(parseISO(event.start.dateTime), "EEEE, MMMM d 'at' h:mm a")
                        : format(parseISO(event.start.date!), "EEEE, MMMM d")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
