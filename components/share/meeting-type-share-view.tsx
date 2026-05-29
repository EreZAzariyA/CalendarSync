"use client"

import { useEffect, useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isBefore,
  isSameDay,
  startOfDay,
  startOfMonth,
  subMonths,
} from "date-fns"
import { formatInTimeZone } from "date-fns-tz"
import { ArrowRight, Calendar as CalendarIcon, CheckCircle2, ChevronLeft, ChevronRight, Clock, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { getDateFnsLocale } from "@/lib/date-locale"
import type { MeetingTypeDTO } from "@/lib/meeting-types"
import type { CustomAnswer } from "@/lib/scheduling"

interface MeetingTypeShareViewProps {
  organizer: {
    id: string
    name: string
    shareToken: string
  }
  meetingType: MeetingTypeDTO
  timeZone: string
}

interface Slot {
  start: string
  end: string
}

export function MeetingTypeShareView({ organizer, meetingType, timeZone }: MeetingTypeShareViewProps) {
  const t = useTranslations("meetingTypeShare")
  const tCommon = useTranslations("common")
  const locale = useLocale()
  const dateLocale = getDateFnsLocale(locale)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [slots, setSlots] = useState<Slot[]>([])
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedSlots, setSelectedSlots] = useState<Slot[]>([])
  const [inviteeName, setInviteeName] = useState("")
  const [inviteeEmail, setInviteeEmail] = useState("")
  const [answers, setAnswers] = useState<Record<string, string>>({})

  useEffect(() => {
    async function fetchSlots() {
      setIsLoading(true)
      try {
        const timeMin = startOfMonth(currentMonth).toISOString()
        const timeMax = endOfMonth(currentMonth).toISOString()
        const response = await fetch(`/api/availability/${organizer.shareToken}/${meetingType.slug}?timeMin=${timeMin}&timeMax=${timeMax}`)
        if (!response.ok) throw new Error("Failed to fetch slots")
        const data = await response.json()
        setSlots(data.slots || [])
      } catch {
        toast.error(t("fetchError"))
        setSlots([])
      } finally {
        setIsLoading(false)
      }
    }

    if (meetingType.bookingMode !== "poll") {
      fetchSlots()
    } else {
      setIsLoading(false)
    }
  }, [currentMonth, organizer.shareToken, meetingType.slug, meetingType.bookingMode])

  const slotsByDay = useMemo(() => {
    const map = new Map<string, Slot[]>()
    slots.forEach((slot) => {
      const key = formatInTimeZone(new Date(slot.start), timeZone, "yyyy-MM-dd")
      map.set(key, [...(map.get(key) || []), slot])
    })
    return map
  }, [slots, timeZone])

  const monthDays = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) })
  const selectedKey = selectedDate ? format(selectedDate, "yyyy-MM-dd") : ""
  const selectedDaySlots = selectedKey ? slotsByDay.get(selectedKey) || [] : []
  const calendarDays = [
    tCommon("daysNarrow.sun"),
    tCommon("daysNarrow.mon"),
    tCommon("daysNarrow.tue"),
    tCommon("daysNarrow.wed"),
    tCommon("daysNarrow.thu"),
    tCommon("daysNarrow.fri"),
    tCommon("daysNarrow.sat"),
  ]

  const customAnswers: CustomAnswer[] = meetingType.customQuestions.map((question) => ({
    questionId: question.id,
    label: question.label,
    value: answers[question.id] || "",
  }))

  const missingRequired = meetingType.customQuestions.some((question) => question.required && !answers[question.id]?.trim())
  const canSubmit = inviteeName.trim().length > 1 && inviteeEmail.includes("@") && selectedSlots.length > 0 && !missingRequired

  const toggleSlot = (slot: Slot) => {
    setSelectedSlots((current) => {
      const exists = current.some((selected) => selected.start === slot.start)
      if (exists) return current.filter((selected) => selected.start !== slot.start)
      if (meetingType.bookingMode === "direct") return [slot]
      if (current.length >= 3) return current
      return [...current, slot]
    })
  }

  const submit = async () => {
    if (!canSubmit) {
      toast.error(t("completeDetails"))
      return
    }

    setIsSubmitting(true)
    try {
      const endpoint = meetingType.bookingMode === "direct" ? "/api/bookings" : "/api/proposals"
      const body =
        meetingType.bookingMode === "direct"
          ? {
              meetingTypeId: meetingType.id,
              startTime: selectedSlots[0].start,
              inviteeName,
              inviteeEmail,
              answers: customAnswers,
            }
          : {
              organizerId: organizer.id,
              organizerName: organizer.name,
              meetingTypeId: meetingType.id,
              proposerName: inviteeName,
              proposerEmail: inviteeEmail,
              proposedSlots: selectedSlots.map((slot) => slot.start),
              answers: customAnswers,
            }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!response.ok) throw new Error("Submit failed")
      setSubmitted(true)
      toast.success(meetingType.bookingMode === "direct" ? t("bookedToast") : t("proposalToast"))
    } catch {
      toast.error(t("staleSlotError"))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="text-center shadow-xl">
          <CardHeader>
            <div className="mx-auto mb-4 w-fit rounded-full bg-green-100 p-4 dark:bg-green-900/40">
              <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-3xl">{meetingType.bookingMode === "direct" ? t("bookedTitle") : t("proposalTitle")}</CardTitle>
            <CardDescription>
              {meetingType.bookingMode === "direct"
                ? t("bookedDescription")
                : t("proposalDescription", { name: organizer.name })}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (meetingType.bookingMode === "poll") {
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">{meetingType.title}</CardTitle>
            <CardDescription>{meetingType.description}</CardDescription>
          </CardHeader>
          <CardContent className="text-center text-muted-foreground">
            {t("pollModeMessage", { name: organizer.name })}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Card className="shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-fit rounded-full bg-primary/10 p-4">
            <CalendarIcon className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-3xl">{meetingType.title}</CardTitle>
          <CardDescription className="text-base">
            {meetingType.description || t("durationWithName", { count: meetingType.durationMinutes, name: organizer.name })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
            <div>
              <h2 className="text-lg font-semibold">{t("yourInfo")}</h2>
              <p className="text-sm text-muted-foreground">{t("yourInfoDesc")}</p>
            </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="guest-name">{t("name")}</Label>
                  <Input id="guest-name" value={inviteeName} onChange={(event) => setInviteeName(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guest-email">{t("email")}</Label>
                  <Input id="guest-email" type="email" value={inviteeEmail} onChange={(event) => setInviteeEmail(event.target.value)} />
                </div>
              </div>
              {meetingType.customQuestions.map((question) => (
                <div key={question.id} className="space-y-2">
                  <Label htmlFor={question.id}>{question.label}{question.required ? " *" : ""}</Label>
                  {question.type === "textarea" ? (
                    <Textarea id={question.id} value={answers[question.id] || ""} onChange={(event) => setAnswers({ ...answers, [question.id]: event.target.value })} />
                  ) : (
                    <Input
                      id={question.id}
                      type={question.type === "phone" ? "tel" : "text"}
                      value={answers[question.id] || ""}
                      onChange={(event) => setAnswers({ ...answers, [question.id]: event.target.value })}
                    />
                  )}
                </div>
              ))}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="mx-auto max-w-md rounded-lg border bg-card p-4">
                <div className="pb-4">
                  <div className="flex items-center justify-between">
                    <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <CardTitle className="text-base font-semibold">{format(currentMonth, "MMMM yyyy", { locale: dateLocale })}</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="pt-0">
                  <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((day, index) => (
                      <div key={`${day}-${index}`} className="py-2 text-center text-xs font-medium text-muted-foreground">{day}</div>
                    ))}
                    {monthDays.map((day) => {
                      const key = format(day, "yyyy-MM-dd")
                      const hasSlots = (slotsByDay.get(key) || []).length > 0
                      const isSelected = selectedDate && isSameDay(day, selectedDate)
                      const isPast = isBefore(startOfDay(day), startOfDay(new Date()))
                      return (
                        <button
                          key={day.toISOString()}
                          disabled={isPast || !hasSlots}
                          onClick={() => setSelectedDate(day)}
                          className={`h-9 w-9 rounded-md text-xs font-medium transition-colors ${
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : hasSlots
                                ? "hover:bg-muted"
                                : "text-muted-foreground/40"
                          }`}
                        >
                          {format(day, "d")}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              <Dialog open={!!selectedDate} onOpenChange={(open) => !open && setSelectedDate(null)}>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{selectedDate && format(selectedDate, "PPPP", { locale: dateLocale })}</DialogTitle>
                    <DialogDescription>
                      {meetingType.bookingMode === "direct" ? t("chooseOne") : t("chooseUpToThree")}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                    {selectedDaySlots.map((slot) => {
                      const selected = selectedSlots.some((current) => current.start === slot.start)
                      return (
                        <button
                          key={slot.start}
                          onClick={() => toggleSlot(slot)}
                          className={`rounded-md border px-3 py-3 text-sm font-medium ${
                            selected ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
                          }`}
                        >
                          {formatInTimeZone(new Date(slot.start), timeZone, "p", { locale: dateLocale })}
                        </button>
                      )
                    })}
                  </div>
                </DialogContent>
              </Dialog>

              {selectedSlots.length > 0 && (
                <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <h2 className="text-lg font-semibold">
                    {selectedSlots.length === 1 ? t("selectedTime") : t("selectedTimes")}
                  </h2>
                    {selectedSlots.map((slot) => (
                      <div key={slot.start} className="flex items-center justify-between rounded-lg border bg-background p-3">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{formatInTimeZone(new Date(slot.start), timeZone, "PPPP p", { locale: dateLocale })}</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => toggleSlot(slot)}>{t("remove")}</Button>
                      </div>
                    ))}
                    <Button className="w-full" size="lg" disabled={!canSubmit || isSubmitting} onClick={submit}>
                      {isSubmitting ? (
                        <><Loader2 className="me-2 h-4 w-4 animate-spin" />{t("sending")}</>
                      ) : (
                        <>{meetingType.bookingMode === "direct" ? t("bookMeeting") : t("proposeTimes")}<ArrowRight className="ms-2 h-4 w-4" /></>
                      )}
                    </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
