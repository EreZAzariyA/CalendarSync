"use client"

import { useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { QRCodeSVG } from "qrcode.react"
import { toast } from "sonner"
import {
  CalendarClock,
  Check,
  Copy,
  ExternalLink,
  LinkIcon,
  Plus,
  QrCode,
  Save,
  Settings2,
  Users,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { getIntlLocale } from "@/lib/date-locale"
import type { MeetingTypeDTO } from "@/lib/meeting-types"
import type { AvailabilityOverrides, BookingMode, CustomQuestion, QuestionType } from "@/lib/scheduling"

interface MeetingTypesManagerProps {
  initialMeetingTypes: MeetingTypeDTO[]
  shareToken: string
}

interface PollDTO {
  id: string
  meetingTypeId: string
  title: string
  shareToken: string
  candidateSlots: string[]
  votes: Array<{ participantEmail: string; selectedSlots: string[] }>
  status: "open" | "finalized" | "closed"
  selectedSlot?: string
}

type MeetingTypeForm = {
  title: string
  slug: string
  description: string
  active: boolean
  bookingMode: BookingMode
  durationMinutes: string
  location: string
  availabilityOverrides: Required<AvailabilityOverrides>
  customQuestions: CustomQuestion[]
  shareMetadata: { welcomeMessage: string }
}

function blankForm(): MeetingTypeForm {
  return {
    title: "",
    slug: "",
    description: "",
    active: true,
    bookingMode: "proposal",
    durationMinutes: "60",
    location: "",
    availabilityOverrides: {
      workingDays: [1, 2, 3, 4, 5],
      startTime: "09:00",
      endTime: "17:00",
      slotIntervalMinutes: 60,
      minNoticeMinutes: 60,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      rollingWindowDays: 30,
      maxBookingsPerDay: 8,
    },
    customQuestions: [],
    shareMetadata: { welcomeMessage: "" },
  }
}

function formFromMeetingType(meetingType: MeetingTypeDTO): MeetingTypeForm {
  const base = blankForm()
  return {
    ...base,
    title: meetingType.title,
    slug: meetingType.slug,
    description: meetingType.description || "",
    active: meetingType.active,
    bookingMode: meetingType.bookingMode,
    durationMinutes: String(meetingType.durationMinutes),
    location: meetingType.location || "",
    availabilityOverrides: {
      ...base.availabilityOverrides,
      ...meetingType.availabilityOverrides,
      workingDays: meetingType.availabilityOverrides.workingDays || base.availabilityOverrides.workingDays,
    },
    customQuestions: meetingType.customQuestions || [],
    shareMetadata: { welcomeMessage: meetingType.shareMetadata?.welcomeMessage || "" },
  }
}

function payloadFromForm(form: MeetingTypeForm) {
  return {
    title: form.title,
    slug: form.slug,
    description: form.description,
    active: form.active,
    bookingMode: form.bookingMode,
    durationMinutes: Number(form.durationMinutes),
    location: form.location,
    availabilityOverrides: {
      ...form.availabilityOverrides,
      slotIntervalMinutes: Number(form.availabilityOverrides.slotIntervalMinutes),
      minNoticeMinutes: Number(form.availabilityOverrides.minNoticeMinutes),
      bufferBeforeMinutes: Number(form.availabilityOverrides.bufferBeforeMinutes),
      bufferAfterMinutes: Number(form.availabilityOverrides.bufferAfterMinutes),
      rollingWindowDays: Number(form.availabilityOverrides.rollingWindowDays),
      maxBookingsPerDay: Number(form.availabilityOverrides.maxBookingsPerDay),
    },
    customQuestions: form.customQuestions,
    shareMetadata: form.shareMetadata,
  }
}

export function MeetingTypesManager({ initialMeetingTypes, shareToken }: MeetingTypesManagerProps) {
  const t = useTranslations("meetingTypes")
  const locale = useLocale()
  const intlLocale = getIntlLocale(locale)
  const [meetingTypes, setMeetingTypes] = useState(initialMeetingTypes)
  const [editing, setEditing] = useState<MeetingTypeDTO | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<MeetingTypeForm>(blankForm())
  const [saving, setSaving] = useState(false)
  const [sharing, setSharing] = useState<MeetingTypeDTO | null>(null)
  const [polling, setPolling] = useState<MeetingTypeDTO | null>(null)
  const [polls, setPolls] = useState<PollDTO[]>([])
  const [pollTitle, setPollTitle] = useState("")
  const [pollDescription, setPollDescription] = useState("")
  const [pollSlots, setPollSlots] = useState(["", ""])

  const baseUrl = useMemo(() => {
    if (typeof window === "undefined") return ""
    return window.location.origin
  }, [])
  const dayOptions = [
    [0, t("days.sun")],
    [1, t("days.mon")],
    [2, t("days.tue")],
    [3, t("days.wed")],
    [4, t("days.thu")],
    [5, t("days.fri")],
    [6, t("days.sat")],
  ] as const

  const openCreate = () => {
    setEditing(null)
    setForm(blankForm())
    setFormOpen(true)
  }

  const openEdit = (meetingType: MeetingTypeDTO) => {
    setEditing(meetingType)
    setForm(formFromMeetingType(meetingType))
    setFormOpen(true)
  }

  const closeForm = () => {
    setEditing(null)
    setForm(blankForm())
    setFormOpen(false)
  }

  const refreshMeetingTypes = async () => {
    const response = await fetch("/api/meeting-types")
    const data = await response.json()
    setMeetingTypes(data.meetingTypes || [])
  }

  const saveMeetingType = async () => {
    setSaving(true)
    try {
      const response = await fetch(editing ? `/api/meeting-types/${editing.id}` : "/api/meeting-types", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadFromForm(form)),
      })
      if (!response.ok) throw new Error("Save failed")
      await refreshMeetingTypes()
      closeForm()
      toast.success(t("saved"))
    } catch {
      toast.error(t("saveError"))
    } finally {
      setSaving(false)
    }
  }

  const duplicateMeetingType = async (meetingType: MeetingTypeDTO) => {
    try {
      const response = await fetch(`/api/meeting-types/${meetingType.id}/duplicate`, { method: "POST" })
      if (!response.ok) throw new Error("Duplicate failed")
      await refreshMeetingTypes()
      toast.success(t("copied"))
    } catch {
      toast.error(t("copyError"))
    }
  }

  const toggleActive = async (meetingType: MeetingTypeDTO) => {
    try {
      const response = await fetch(`/api/meeting-types/${meetingType.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !meetingType.active }),
      })
      if (!response.ok) throw new Error("Update failed")
      await refreshMeetingTypes()
    } catch {
      toast.error(t("statusError"))
    }
  }

  const updateRule = (key: keyof MeetingTypeForm["availabilityOverrides"], value: string | number[] | number) => {
    setForm((current) => ({
      ...current,
      availabilityOverrides: {
        ...current.availabilityOverrides,
        [key]: value,
      },
    }))
  }

  const toggleWorkingDay = (day: number) => {
    const days = form.availabilityOverrides.workingDays
    const next = days.includes(day) ? days.filter((value) => value !== day) : [...days, day].sort()
    updateRule("workingDays", next.length > 0 ? next : days)
  }

  const addQuestion = () => {
    setForm((current) => ({
      ...current,
      customQuestions: [
        ...current.customQuestions,
        { id: crypto.randomUUID(), label: "", type: "text", required: false },
      ],
    }))
  }

  const updateQuestion = (index: number, patch: Partial<CustomQuestion>) => {
    setForm((current) => ({
      ...current,
      customQuestions: current.customQuestions.map((question, questionIndex) =>
        questionIndex === index ? { ...question, ...patch } : question,
      ),
    }))
  }

  const removeQuestion = (index: number) => {
    setForm((current) => ({
      ...current,
      customQuestions: current.customQuestions.filter((_, questionIndex) => questionIndex !== index),
    }))
  }

  const publicUrl = (meetingType: MeetingTypeDTO) => {
    return shareToken ? `${baseUrl}/share/${shareToken}/${meetingType.slug}` : `${baseUrl}/share/[token]/${meetingType.slug}`
  }

  const copyText = async (text: string, message: string) => {
    await navigator.clipboard.writeText(text)
    toast.success(message)
  }

  const loadPolls = async () => {
    const response = await fetch("/api/polls")
    const data = await response.json()
    setPolls(data.polls || [])
  }

  const openPollDialog = async (meetingType: MeetingTypeDTO) => {
    setPolling(meetingType)
    setPollTitle(t("poll.defaultTitle", { title: meetingType.title }))
    setPollDescription("")
    setPollSlots(["", ""])
    await loadPolls()
  }

  const createPoll = async () => {
    if (!polling) return
    try {
      const candidateSlots = pollSlots.filter(Boolean).map((value) => new Date(value).toISOString())
      const response = await fetch("/api/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meetingTypeId: polling.id,
          title: pollTitle,
          description: pollDescription,
          candidateSlots,
        }),
      })
      if (!response.ok) throw new Error("Poll failed")
      await loadPolls()
      toast.success(t("poll.created"))
    } catch {
      toast.error(t("poll.invalidSlots"))
    }
  }

  const finalizePoll = async (poll: PollDTO, selectedSlot: string) => {
    try {
      const response = await fetch(`/api/polls/${poll.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "finalized", selectedSlot: new Date(selectedSlot).toISOString() }),
      })
      if (!response.ok) throw new Error("Finalize failed")
      await loadPolls()
      toast.success(t("poll.finalized"))
    } catch {
      toast.error(t("poll.finalizeError"))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          {t("new")}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {meetingTypes.map((meetingType) => (
          <Card key={meetingType.id} className={!meetingType.active ? "opacity-70" : undefined}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <CalendarClock className="h-5 w-5 text-primary" />
                    {meetingType.title}
                  </CardTitle>
                  <CardDescription className="mt-1">{meetingType.description || t("noDescription")}</CardDescription>
                </div>
                <Badge variant={meetingType.active ? "default" : "secondary"}>
                  {meetingType.active ? t("active") : t("off")}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-md bg-muted p-2">
                  <div className="text-xs text-muted-foreground">{t("modeLabel")}</div>
                  <div className="font-medium">{t(`mode.${meetingType.bookingMode}`)}</div>
                </div>
                <div className="rounded-md bg-muted p-2">
                  <div className="text-xs text-muted-foreground">{t("duration")}</div>
                  <div className="font-medium">{t("minutesShort", { count: meetingType.durationMinutes })}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(meetingType)}>
                  <Settings2 className="h-4 w-4" />
                  {t("edit")}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setSharing(meetingType)}>
                  <QrCode className="h-4 w-4" />
                  {t("share")}
                </Button>
                <Button size="sm" variant="outline" onClick={() => duplicateMeetingType(meetingType)}>
                  <Copy className="h-4 w-4" />
                  {t("copy")}
                </Button>
                {meetingType.bookingMode === "poll" && (
                  <Button size="sm" variant="outline" onClick={() => openPollDialog(meetingType)}>
                    <Users className="h-4 w-4" />
                    {t("polls")}
                  </Button>
                )}
              </div>
              <div className="flex items-center justify-between border-t pt-3">
                <Label htmlFor={`active-${meetingType.id}`}>{t("acceptNewGuests")}</Label>
                <Switch id={`active-${meetingType.id}`} checked={meetingType.active} onCheckedChange={() => toggleActive(meetingType)} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={formOpen} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editing ? t("editTitle") : t("newTitle")}</DialogTitle>
            <DialogDescription>{t("formDescription")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="mt-title">{t("field.title")}</Label>
                <Input id="mt-title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mt-slug">{t("field.slug")}</Label>
                <Input id="mt-slug" value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mt-mode">{t("field.mode")}</Label>
                <Select value={form.bookingMode} onValueChange={(value) => setForm({ ...form, bookingMode: value as BookingMode })}>
                  <SelectTrigger id="mt-mode" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="direct">{t("mode.direct")}</SelectItem>
                    <SelectItem value="proposal">{t("mode.proposal")}</SelectItem>
                    <SelectItem value="poll">{t("mode.poll")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mt-duration">{t("duration")}</Label>
                <Select value={form.durationMinutes} onValueChange={(value) => setForm({ ...form, durationMinutes: value })}>
                  <SelectTrigger id="mt-duration" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">{t("minutes", { count: 15 })}</SelectItem>
                    <SelectItem value="30">{t("minutes", { count: 30 })}</SelectItem>
                    <SelectItem value="45">{t("minutes", { count: 45 })}</SelectItem>
                    <SelectItem value="60">{t("minutes", { count: 60 })}</SelectItem>
                    <SelectItem value="90">{t("minutes", { count: 90 })}</SelectItem>
                    <SelectItem value="120">{t("minutes", { count: 120 })}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mt-description">{t("field.description")}</Label>
              <Textarea id="mt-description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mt-location">{t("field.location")}</Label>
              <Input id="mt-location" placeholder={t("locationPlaceholder")} value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} />
            </div>
            <div className="rounded-md border p-4">
              <h3 className="mb-4 text-sm font-semibold">{t("availabilityOverrides")}</h3>
              <div className="mb-4 flex flex-wrap gap-2">
                {dayOptions.map(([day, label]) => {
                  const selected = form.availabilityOverrides.workingDays.includes(day)
                  return (
                    <Button key={day} type="button" size="sm" variant={selected ? "default" : "outline"} onClick={() => toggleWorkingDay(day)}>
                      {label}
                    </Button>
                  )
                })}
              </div>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <Label>{t("rules.start")}</Label>
                  <Input type="time" value={form.availabilityOverrides.startTime} onChange={(event) => updateRule("startTime", event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t("rules.end")}</Label>
                  <Input type="time" value={form.availabilityOverrides.endTime} onChange={(event) => updateRule("endTime", event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t("rules.interval")}</Label>
                  <Input type="number" value={form.availabilityOverrides.slotIntervalMinutes} onChange={(event) => updateRule("slotIntervalMinutes", Number(event.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>{t("rules.minNotice")}</Label>
                  <Input type="number" value={form.availabilityOverrides.minNoticeMinutes} onChange={(event) => updateRule("minNoticeMinutes", Number(event.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>{t("rules.bufferBefore")}</Label>
                  <Input type="number" value={form.availabilityOverrides.bufferBeforeMinutes} onChange={(event) => updateRule("bufferBeforeMinutes", Number(event.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>{t("rules.bufferAfter")}</Label>
                  <Input type="number" value={form.availabilityOverrides.bufferAfterMinutes} onChange={(event) => updateRule("bufferAfterMinutes", Number(event.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>{t("rules.windowDays")}</Label>
                  <Input type="number" value={form.availabilityOverrides.rollingWindowDays} onChange={(event) => updateRule("rollingWindowDays", Number(event.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>{t("rules.maxPerDay")}</Label>
                  <Input type="number" value={form.availabilityOverrides.maxBookingsPerDay} onChange={(event) => updateRule("maxBookingsPerDay", Number(event.target.value))} />
                </div>
              </div>
            </div>
            <div className="rounded-md border p-4">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold">{t("customQuestions")}</h3>
                <Button type="button" size="sm" variant="outline" onClick={addQuestion}>
                  <Plus className="h-4 w-4" />
                  {t("add")}
                </Button>
              </div>
              <div className="space-y-3">
                {form.customQuestions.map((question, index) => (
                  <div key={question.id} className="grid gap-2 rounded-md bg-muted p-3 md:grid-cols-[1fr_130px_100px_auto]">
                    <Input value={question.label} placeholder={t("questionPlaceholder")} onChange={(event) => updateQuestion(index, { label: event.target.value })} />
                    <Select value={question.type} onValueChange={(value) => updateQuestion(index, { type: value as QuestionType })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">{t("questionType.text")}</SelectItem>
                        <SelectItem value="textarea">{t("questionType.textarea")}</SelectItem>
                        <SelectItem value="phone">{t("questionType.phone")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2">
                      <Switch checked={question.required} onCheckedChange={(required) => updateQuestion(index, { required })} />
                      <span className="text-sm">{t("required")}</span>
                    </div>
                    <Button type="button" variant="ghost" onClick={() => removeQuestion(index)}>{t("remove")}</Button>
                  </div>
                ))}
                {form.customQuestions.length === 0 && <p className="text-sm text-muted-foreground">{t("noQuestions")}</p>}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>{t("cancel")}</Button>
            <Button onClick={saveMeetingType} disabled={saving || !form.title}>
              {saving ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(sharing)} onOpenChange={(open) => !open && setSharing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{sharing ? t("shareTitle", { title: sharing.title }) : t("share")}</DialogTitle>
            <DialogDescription>{t("shareDescription")}</DialogDescription>
          </DialogHeader>
          {sharing && (
            <div className="space-y-4">
              <div className="flex justify-center rounded-md bg-white p-4">
                <QRCodeSVG value={publicUrl(sharing)} size={180} />
              </div>
              <div className="rounded-md bg-muted p-3 text-xs break-all">{publicUrl(sharing)}</div>
              <Textarea readOnly value={`<iframe src="${publicUrl(sharing)}" width="100%" height="720" style="border:0;border-radius:8px"></iframe>`} />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => copyText(publicUrl(sharing), t("linkCopied"))}>
                  <LinkIcon className="h-4 w-4" />
                  {t("copyLink")}
                </Button>
                <Button size="sm" variant="outline" onClick={() => copyText(`<iframe src="${publicUrl(sharing)}" width="100%" height="720" style="border:0;border-radius:8px"></iframe>`, t("embedCopied"))}>
                  <Copy className="h-4 w-4" />
                  {t("copyEmbed")}
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <a href={publicUrl(sharing)} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    {t("open")}
                  </a>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(polling)} onOpenChange={(open) => !open && setPolling(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t("poll.title")}</DialogTitle>
            <DialogDescription>{t("poll.description")}</DialogDescription>
          </DialogHeader>
          {polling && (
            <div className="space-y-5">
              <div className="rounded-md border p-4">
                <div className="grid gap-3">
                  <Input value={pollTitle} onChange={(event) => setPollTitle(event.target.value)} placeholder={t("poll.titlePlaceholder")} />
                  <Textarea value={pollDescription} onChange={(event) => setPollDescription(event.target.value)} placeholder={t("poll.descriptionPlaceholder")} />
                  <div className="space-y-2">
                    {pollSlots.map((slot, index) => (
                      <Input
                        key={index}
                        type="datetime-local"
                        value={slot}
                        onChange={(event) => setPollSlots((current) => current.map((value, slotIndex) => slotIndex === index ? event.target.value : value))}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setPollSlots((current) => [...current, ""])} disabled={pollSlots.length >= 10}>
                      <Plus className="h-4 w-4" />
                      {t("poll.slot")}
                    </Button>
                    <Button type="button" onClick={createPoll} disabled={!pollTitle || pollSlots.filter(Boolean).length < 2}>
                      {t("poll.create")}
                    </Button>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                {polls.filter((poll) => poll.status !== "closed" && poll.meetingTypeId === polling.id).map((poll) => {
                  const pollUrl = `${baseUrl}/polls/${poll.shareToken}`
                  return (
                    <div key={poll.id} className="rounded-md border p-4">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium">{poll.title}</div>
                          <div className="text-sm text-muted-foreground">{t("poll.votes", { count: poll.votes.length })}</div>
                        </div>
                        <Badge>{t(`poll.status.${poll.status}`)}</Badge>
                      </div>
                      <div className="mb-3 rounded-md bg-muted p-2 text-xs break-all">{pollUrl}</div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => copyText(pollUrl, t("poll.linkCopied"))}>
                          <LinkIcon className="h-4 w-4" />
                          {t("poll.copy")}
                        </Button>
                        {poll.status === "open" &&
                          poll.candidateSlots.map((slot) => (
                            <Button key={slot} size="sm" onClick={() => finalizePoll(poll, slot)}>
                              {t("poll.finalize", {
                                date: new Intl.DateTimeFormat(intlLocale, {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                }).format(new Date(slot)),
                              })}
                            </Button>
                          ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
