"use client"

import { useEffect, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { format } from "date-fns"
import { CheckCircle2, Loader2, Users } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { getDateFnsLocale } from "@/lib/date-locale"
import type { MeetingTypeDTO } from "@/lib/meeting-types"
import type { CustomAnswer } from "@/lib/scheduling"

interface PollVoteViewProps {
  shareToken: string
}

interface PublicPoll {
  id: string
  title: string
  description?: string
  organizerName: string
  candidateSlots: string[]
  votes: Array<{ participantName: string; participantEmail: string; selectedSlots: string[] }>
  status: "open" | "finalized" | "closed"
  selectedSlot?: string
}

export function PollVoteView({ shareToken }: PollVoteViewProps) {
  const t = useTranslations("polls")
  const locale = useLocale()
  const dateLocale = getDateFnsLocale(locale)
  const [poll, setPoll] = useState<PublicPoll | null>(null)
  const [meetingType, setMeetingType] = useState<MeetingTypeDTO | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [selectedSlots, setSelectedSlots] = useState<string[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})

  useEffect(() => {
    async function fetchPoll() {
      try {
        const response = await fetch(`/api/public/polls/${shareToken}`)
        if (!response.ok) throw new Error("Poll not found")
        const data = await response.json()
        setPoll(data.poll)
        setMeetingType(data.meetingType)
      } catch {
        toast.error(t("loadError"))
      } finally {
        setLoading(false)
      }
    }

    fetchPoll()
  }, [shareToken])

  const toggleSlot = (slot: string) => {
    setSelectedSlots((current) =>
      current.includes(slot) ? current.filter((value) => value !== slot) : [...current, slot],
    )
  }

  const customAnswers: CustomAnswer[] = (meetingType?.customQuestions || []).map((question) => ({
    questionId: question.id,
    label: question.label,
    value: answers[question.id] || "",
  }))

  const missingRequired = (meetingType?.customQuestions || []).some((question) => question.required && !answers[question.id]?.trim())
  const canSubmit = name.trim().length > 1 && email.includes("@") && selectedSlots.length > 0 && !missingRequired

  const submitVote = async () => {
    if (!canSubmit) {
      toast.error(t("completeDetails"))
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(`/api/public/polls/${shareToken}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantName: name,
          participantEmail: email,
          selectedSlots,
          answers: customAnswers,
        }),
      })
      if (!response.ok) throw new Error("Vote failed")
      setSubmitted(true)
      toast.success(t("voteSubmittedToast"))
    } catch {
      toast.error(t("voteError"))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!poll || !meetingType) {
    return (
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>{t("notFoundTitle")}</CardTitle>
          <CardDescription>{t("notFoundDesc")}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (submitted) {
    return (
      <Card className="mx-auto max-w-2xl text-center shadow-xl">
        <CardHeader>
          <div className="mx-auto mb-4 w-fit rounded-full bg-green-100 p-4 dark:bg-green-900/40">
            <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-3xl">{t("voteSubmittedTitle")}</CardTitle>
          <CardDescription>{t("voteSubmittedDesc", { name: poll.organizerName })}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="mx-auto max-w-3xl shadow-xl">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 w-fit rounded-full bg-primary/10 p-4">
          <Users className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-3xl">{poll.title}</CardTitle>
        <CardDescription>{poll.description || t("defaultDescription", { title: meetingType.title })}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {poll.status !== "open" ? (
          <div className="rounded-md bg-muted p-4 text-center text-muted-foreground">
            {t("closedStatus", { status: t(`status.${poll.status}`) })}
            {poll.selectedSlot ? ` ${t("selectedTime", { date: format(new Date(poll.selectedSlot), "PPP p", { locale: dateLocale }) })}` : ""}
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="poll-name">{t("name")}</Label>
                <Input id="poll-name" value={name} onChange={(event) => setName(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="poll-email">{t("email")}</Label>
                <Input id="poll-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
              </div>
            </div>
            {(meetingType.customQuestions || []).map((question) => (
              <div key={question.id} className="space-y-2">
                <Label htmlFor={question.id}>{question.label}{question.required ? " *" : ""}</Label>
                {question.type === "textarea" ? (
                  <Textarea id={question.id} value={answers[question.id] || ""} onChange={(event) => setAnswers({ ...answers, [question.id]: event.target.value })} />
                ) : (
                  <Input id={question.id} value={answers[question.id] || ""} onChange={(event) => setAnswers({ ...answers, [question.id]: event.target.value })} />
                )}
              </div>
            ))}
            <div className="grid gap-3 md:grid-cols-2">
              {poll.candidateSlots.map((slot) => {
                const selected = selectedSlots.includes(slot)
                const votes = poll.votes.filter((vote) => vote.selectedSlots.includes(slot)).length
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => toggleSlot(slot)}
                    className={`rounded-md border p-4 text-left transition-colors ${
                      selected ? "border-primary bg-primary/10" : "hover:bg-muted"
                    }`}
                  >
                    <div className="font-medium">{format(new Date(slot), "PPPP", { locale: dateLocale })}</div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(slot), "p", { locale: dateLocale })} · {t("votes", { count: votes })}
                    </div>
                  </button>
                )
              })}
            </div>
            <Button className="w-full" size="lg" disabled={!canSubmit || submitting} onClick={submitVote}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t("submitVote")}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
