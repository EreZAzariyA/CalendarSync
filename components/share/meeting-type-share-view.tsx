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
import { ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, Clock, Loader2, X } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
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
        const response = await fetch(
          `/api/availability/${organizer.shareToken}/${meetingType.slug}?timeMin=${timeMin}&timeMax=${timeMax}`
        )
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
  const monthStartOffset = startOfMonth(currentMonth).getDay()
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

  const missingRequired = meetingType.customQuestions.some(
    (question) => question.required && !answers[question.id]?.trim()
  )
  const canSubmit =
    inviteeName.trim().length > 1 &&
    inviteeEmail.includes("@") &&
    selectedSlots.length > 0 &&
    !missingRequired

  const toggleSlot = (slot: Slot) => {
    setSelectedSlots((current) => {
      const exists = current.some((s) => s.start === slot.start)
      if (exists) return current.filter((s) => s.start !== slot.start)
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
              proposedSlots: selectedSlots.map((s) => s.start),
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

  const initials = organizer.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  if (submitted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md mx-auto p-10 rounded-2xl border bg-card shadow-xl">
          <div className="mx-auto mb-6 w-fit rounded-full bg-green-100 p-5 dark:bg-green-900/40">
            <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold">
            {meetingType.bookingMode === "direct" ? t("bookedTitle") : t("proposalTitle")}
          </h2>
          <p className="mt-2 text-muted-foreground">
            {meetingType.bookingMode === "direct"
              ? t("bookedDescription")
              : t("proposalDescription", { name: organizer.name })}
          </p>
        </div>
      </div>
    )
  }

  if (meetingType.bookingMode === "poll") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md mx-auto p-10 rounded-2xl border bg-card shadow-xl">
          <div className="mx-auto mb-4 w-fit rounded-full bg-primary/10 p-4">
            <Clock className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold">{meetingType.title}</h2>
          <p className="mt-2 text-muted-foreground">{t("pollModeMessage", { name: organizer.name })}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-5xl mx-auto rounded-2xl shadow-xl border bg-card overflow-hidden flex flex-col md:flex-row">
      {/* LEFT PANEL — organizer info + form + submit */}
      <div className="md:w-80 lg:w-96 shrink-0 flex flex-col gap-6 p-8 bg-muted/40 border-b md:border-b-0 md:border-r">
        {/* Organizer + meeting info */}
        <div className="flex flex-col gap-3">
          <div className="h-14 w-14 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xl font-bold select-none">
            {initials}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{organizer.name}</p>
            <h1 className="text-xl font-bold leading-tight mt-0.5">{meetingType.title}</h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="gap-1.5">
              <Clock className="h-3 w-3" />
              {meetingType.durationMinutes} min
            </Badge>
            {meetingType.bookingMode !== "direct" && (
              <Badge variant="outline" className="capitalize">
                {meetingType.bookingMode}
              </Badge>
            )}
          </div>
          {meetingType.description && (
            <p className="text-sm text-muted-foreground">{meetingType.description}</p>
          )}
        </div>

        <Separator />

        {/* User form */}
        <div className="flex flex-col gap-4">
          <h2 className="font-semibold text-sm">{t("yourInfo")}</h2>
          <div className="space-y-2">
            <Label htmlFor="guest-name">{t("name")}</Label>
            <Input
              id="guest-name"
              value={inviteeName}
              onChange={(e) => setInviteeName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="guest-email">{t("email")}</Label>
            <Input
              id="guest-email"
              type="email"
              value={inviteeEmail}
              onChange={(e) => setInviteeEmail(e.target.value)}
            />
          </div>
          {meetingType.customQuestions.map((question) => (
            <div key={question.id} className="space-y-2">
              <Label htmlFor={question.id}>
                {question.label}
                {question.required ? " *" : ""}
              </Label>
              {question.type === "textarea" ? (
                <Textarea
                  id={question.id}
                  value={answers[question.id] || ""}
                  onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })}
                />
              ) : (
                <Input
                  id={question.id}
                  type={question.type === "phone" ? "tel" : "text"}
                  value={answers[question.id] || ""}
                  onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })}
                />
              )}
            </div>
          ))}
        </div>

        {/* Selected slots + submit */}
        <div className="flex flex-col gap-3 mt-auto">
          {selectedSlots.length > 0 && (
            <div className="flex flex-col gap-2">
              {selectedSlots.map((slot) => (
                <div
                  key={slot.start}
                  className="flex items-center justify-between rounded-lg border bg-background px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span>{formatInTimeZone(new Date(slot.start), timeZone, "MMM d, p", { locale: dateLocale })}</span>
                  </div>
                  <button
                    onClick={() => toggleSlot(slot)}
                    className="text-muted-foreground hover:text-foreground ml-2 shrink-0"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <Button className="w-full" size="lg" disabled={!canSubmit || isSubmitting} onClick={submit}>
            {isSubmitting ? (
              <>
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
                {t("sending")}
              </>
            ) : (
              <>
                {meetingType.bookingMode === "direct" ? t("bookMeeting") : t("proposeTimes")}
                <ArrowRight className="ms-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>

      {/* RIGHT PANEL — calendar + inline time slots */}
      <div className="flex-1 flex flex-col gap-6 p-8">
        {isLoading ? (
          <div className="flex flex-1 items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Month navigation */}
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCurrentMonth(subMonths(currentMonth, 1))
                  setSelectedDate(null)
                }}
              >
                <ChevronLeft className={`h-4 w-4 ${locale === "he" ? "rotate-180" : ""}`} />
              </Button>
              <span className="font-semibold">
                {format(currentMonth, "MMMM yyyy", { locale: dateLocale })}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCurrentMonth(addMonths(currentMonth, 1))
                  setSelectedDate(null)
                }}
              >
                <ChevronRight className={`h-4 w-4 ${locale === "he" ? "rotate-180" : ""}`} />
              </Button>
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, i) => (
                <div key={`${day}-${i}`} className="py-2 text-center text-xs font-medium text-muted-foreground">
                  {day}
                </div>
              ))}
              {Array.from({ length: monthStartOffset }).map((_, i) => (
                <div key={`offset-${i}`} />
              ))}
              {monthDays.map((day) => {
                const key = format(day, "yyyy-MM-dd")
                const hasSlots = (slotsByDay.get(key) || []).length > 0
                const isSelected = selectedDate ? isSameDay(day, selectedDate) : false
                const isPast = isBefore(startOfDay(day), startOfDay(new Date()))
                return (
                  <button
                    key={day.toISOString()}
                    disabled={isPast || !hasSlots}
                    onClick={() => setSelectedDate(isSelected ? null : day)}
                    className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : hasSlots && !isPast
                          ? "hover:bg-muted cursor-pointer"
                          : "text-muted-foreground/40 cursor-default"
                    }`}
                  >
                    {format(day, "d")}
                  </button>
                )
              })}
            </div>

            {/* Inline time slots */}
            {selectedDate && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-3">
                  {format(selectedDate, "PPPP", { locale: dateLocale })}
                </p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {selectedDaySlots.map((slot) => {
                    const isSlotSelected = selectedSlots.some((s) => s.start === slot.start)
                    return (
                      <button
                        key={slot.start}
                        onClick={() => toggleSlot(slot)}
                        className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                          isSlotSelected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "hover:border-primary/50 hover:bg-muted"
                        }`}
                      >
                        {formatInTimeZone(new Date(slot.start), timeZone, "p", { locale: dateLocale })}
                      </button>
                    )
                  })}
                </div>
                {meetingType.bookingMode !== "direct" && selectedDaySlots.length > 0 && (
                  <p className="mt-3 text-xs text-muted-foreground">{t("chooseUpToThree")}</p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
