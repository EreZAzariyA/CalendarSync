"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Calendar as CalendarIcon, Clock, Loader2, ArrowRight, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, setHours, setMinutes, addMonths, subMonths, isBefore, startOfDay } from "date-fns"
import type { FreeBusyPeriod } from "@/lib/google-calendar"
import { toast } from "sonner"

interface ShareAvailabilityViewProps {
  userId: string
  userName: string
  shareToken: string
}

export function ShareAvailabilityView({ userId, userName, shareToken }: ShareAvailabilityViewProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [freeBusy, setFreeBusy] = useState<FreeBusyPeriod[]>([])
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedSlots, setSelectedSlots] = useState<Date[]>([])
  const [proposerName, setProposerName] = useState("")
  const [proposerEmail, setProposerEmail] = useState("")

  useEffect(() => {
    async function fetchFreeBusy() {
      setIsLoading(true)
      try {
        const timeMin = startOfMonth(currentMonth).toISOString()
        const timeMax = endOfMonth(currentMonth).toISOString()

        const response = await fetch(
          `/api/calendar/freebusy/${shareToken}?timeMin=${timeMin}&timeMax=${timeMax}`
        )

        if (!response.ok) {
          throw new Error("Failed to fetch availability")
        }

        const data = await response.json()
        setFreeBusy(data.busy || [])
      } catch (error) {
        console.error("Failed to fetch free/busy data:", error)
        toast.error("Failed to load availability data")
        setFreeBusy([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchFreeBusy()
  }, [shareToken, currentMonth])

  const monthDays = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  })

  // Check if a time slot is busy
  const isSlotBusy = (slot: Date): boolean => {
    const slotTime = slot.getTime()
    return freeBusy.some((period) => {
      const start = new Date(period.start).getTime()
      const end = new Date(period.end).getTime()
      return slotTime >= start && slotTime < end
    })
  }

  // Generate available time slots (9 AM - 5 PM, hourly)
  // Filter out busy slots
  const generateTimeSlots = (day: Date) => {
    const slots: Date[] = []
    for (let hour = 9; hour <= 17; hour++) {
      const slot = setMinutes(setHours(day, hour), 0)
      // Only add slot if it's not busy
      if (!isSlotBusy(slot)) {
        slots.push(slot)
      }
    }
    return slots
  }

  const toggleSlot = (slot: Date) => {
    setSelectedSlots((prev) => {
      const exists = prev.some((s) => s.getTime() === slot.getTime())
      if (exists) {
        return prev.filter((s) => s.getTime() !== slot.getTime())
      }
      if (prev.length >= 3) {
        return prev
      }
      return [...prev, slot].sort((a, b) => a.getTime() - b.getTime())
    })
  }

  const isSlotSelected = (slot: Date) => {
    return selectedSlots.some((s) => s.getTime() === slot.getTime())
  }

  const handleProposeSlots = async () => {
    if (!proposerName || !proposerEmail) {
      toast.error("Please enter your name and email")
      return
    }

    if (selectedSlots.length === 0) {
      toast.error("Please select at least one time slot")
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/proposals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organizerId: userId,
          organizerName: userName,
          proposerName,
          proposerEmail,
          proposedSlots: selectedSlots.map((slot) => slot.toISOString()),
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to submit proposal")
      }

      setSubmitted(true)
      toast.success("Meeting proposal sent successfully!")
    } catch (error) {
      console.error("Failed to submit proposal:", error)
      toast.error("Failed to send proposal. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="border-border/50 shadow-xl text-center">
          <CardHeader>
            <div className="mx-auto mb-4 rounded-full bg-green-100 p-4 w-fit">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
            <CardTitle className="text-3xl">Proposal Sent!</CardTitle>
            <CardDescription className="text-base">Your meeting proposal has been sent successfully</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              The organizer will review your proposed times and confirm the meeting. You'll receive an email once a time
              is selected.
            </p>
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <h3 className="font-medium text-sm">Your Proposed Times:</h3>
              {selectedSlots.map((slot, index) => (
                <div key={slot.toISOString()} className="text-sm text-muted-foreground">
                  {index + 1}. {format(slot, "EEEE, MMMM d 'at' h:mm a")}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Card className="border-border/50 shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 rounded-full bg-primary/10 p-4 w-fit">
            <CalendarIcon className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-3xl">Schedule a Meeting</CardTitle>
          <CardDescription className="text-base">Select up to 3 time slots that work for you</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6">
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="text-lg">Your Information</CardTitle>
                  <CardDescription>We'll use this to send you meeting confirmations</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        placeholder="John Doe"
                        value={proposerName}
                        onChange={(e) => setProposerName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="john@example.com"
                        value={proposerEmail}
                        onChange={(e) => setProposerEmail(e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Month Calendar */}
              <Card className="max-w-md mx-auto">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <CardTitle className="text-base font-semibold">{format(currentMonth, "MMMM yyyy")}</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-7 gap-1">
                    {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
                      <div key={i} className="text-center text-xs font-medium text-muted-foreground py-2">
                        {day}
                      </div>
                    ))}
                    {monthDays.map((day) => {
                      const isToday = isSameDay(day, new Date())
                      const isPast = isBefore(startOfDay(day), startOfDay(new Date()))
                      const isSelected = selectedDate && isSameDay(day, selectedDate)

                      return (
                        <button
                          key={day.toISOString()}
                          onClick={() => {
                            if (!isPast) {
                              setSelectedDate(day)
                            }
                          }}
                          disabled={isPast}
                          className={`h-9 w-9 rounded-md text-xs font-medium transition-colors ${
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : isToday
                                ? "border-2 border-primary bg-primary/10"
                                : isPast
                                  ? "text-muted-foreground/40 cursor-not-allowed"
                                  : "hover:bg-muted"
                          }`}
                        >
                          {format(day, "d")}
                        </button>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Time Slots Modal */}
              <Dialog open={!!selectedDate} onOpenChange={(open) => !open && setSelectedDate(null)}>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      Available Times - {selectedDate && format(selectedDate, "EEEE, MMMM d")}
                    </DialogTitle>
                    <DialogDescription>Select up to 3 time slots that work for you</DialogDescription>
                  </DialogHeader>
                  <div className="mt-4">
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                      {selectedDate && generateTimeSlots(selectedDate).map((slot) => {
                        const selected = isSlotSelected(slot)
                        const disabled = selectedSlots.length >= 3 && !selected

                        return (
                          <button
                            key={slot.toISOString()}
                            onClick={() => {
                              if (!disabled) {
                                toggleSlot(slot)
                              }
                            }}
                            disabled={disabled}
                            className={`rounded-md px-3 py-3 text-sm font-medium transition-colors ${
                              selected
                                ? "bg-primary text-primary-foreground"
                                : disabled
                                  ? "bg-muted/50 text-muted-foreground cursor-not-allowed"
                                  : "bg-muted hover:bg-muted/80 border"
                            }`}
                          >
                            {format(slot, "h:mm a")}
                          </button>
                        )
                      })}
                    </div>
                    <div className="mt-4 flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setSelectedDate(null)}>
                        Close
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {selectedSlots.length > 0 && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader>
                    <CardTitle className="text-lg">Selected Time Slots ({selectedSlots.length}/3)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {selectedSlots.map((slot, index) => (
                      <div
                        key={slot.toISOString()}
                        className="flex items-center justify-between rounded-lg bg-background p-3 border"
                      >
                        <div className="flex items-center gap-3">
                          <div className="rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium">{format(slot, "EEEE, MMMM d")}</div>
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(slot, "h:mm a")}
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => toggleSlot(slot)}>
                          Remove
                        </Button>
                      </div>
                    ))}
                    <Button
                      className="w-full mt-4"
                      size="lg"
                      onClick={handleProposeSlots}
                      disabled={selectedSlots.length === 0 || !proposerName || !proposerEmail || isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          Propose These Times
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How it works</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                1
              </span>
              <span>Select up to 3 time slots that work best for you</span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                2
              </span>
              <span>The meeting organizer will review your proposed times</span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                3
              </span>
              <span>Once confirmed, the meeting will be added to both calendars</span>
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}
