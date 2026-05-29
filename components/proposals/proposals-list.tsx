"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, Loader2, Check, X, Mail } from "lucide-react"
import { format } from "date-fns"
import type { MeetingProposal } from "@/lib/proposals"
import { getDateFnsLocale } from "@/lib/date-locale"
import { formatInTimeZone } from "@/lib/format"
import { toast } from "sonner"
import { useLocale, useTranslations } from "next-intl"

interface ProposalsListProps {
  timezone: string
}

export function ProposalsList({ timezone }: ProposalsListProps) {
  const [proposals, setProposals] = useState<MeetingProposal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [acceptingId, setAcceptingId] = useState<string | null>(null)
  const t = useTranslations("proposals")
  const locale = useLocale()
  const dateLocale = getDateFnsLocale(locale)

  useEffect(() => {
    fetchProposals()
  }, [])

  const fetchProposals = async () => {
    try {
      const response = await fetch("/api/proposals")
      const data = await response.json()
      setProposals(data.proposals || [])
    } catch {
      console.error("Failed to fetch proposals")
    } finally {
      setIsLoading(false)
    }
  }

  const handleAccept = async (proposalId: string, selectedSlot: Date) => {
    setAcceptingId(proposalId)
    try {
      const updateResponse = await fetch(`/api/proposals/${proposalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "accepted", selectedSlot: selectedSlot.toISOString() }),
      })
      if (!updateResponse.ok) throw new Error("Failed to accept proposal")
      const { calendarEventCreated } = await updateResponse.json()
      toast.success(calendarEventCreated ? t("acceptSuccess") : t("acceptPartial"))
      fetchProposals()
    } catch {
      toast.error(t("acceptError"))
    } finally {
      setAcceptingId(null)
    }
  }

  const handleReject = async (proposalId: string) => {
    try {
      const response = await fetch(`/api/proposals/${proposalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected" }),
      })
      if (!response.ok) throw new Error("Failed to reject proposal")
      toast.success(t("rejectSuccess"))
      fetchProposals()
    } catch {
      toast.error(t("rejectError"))
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (proposals.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">{t("noProposals")}</h3>
          <p className="text-muted-foreground">{t("noProposalsDesc")}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {proposals.map((proposal) => (
        <Card key={proposal.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  {t("requestFrom", { name: proposal.proposerName })}
                  <Badge
                    variant={
                      proposal.status === "pending" ? "default" : proposal.status === "accepted" ? "secondary" : "destructive"
                    }
                  >
                    {t(`status.${proposal.status}`)}
                  </Badge>
                </CardTitle>
                <CardDescription className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {proposal.proposerEmail}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(proposal.createdAt), "PPP", { locale: dateLocale })}
                  </span>
                </CardDescription>
                {proposal.meetingTypeTitle && (
                  <div className="text-sm text-muted-foreground">
                    {proposal.meetingTypeTitle}
                    {proposal.durationMinutes ? ` · ${t("minutesShort", { count: proposal.durationMinutes })}` : ""}
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {proposal.answers && proposal.answers.length > 0 && (
              <div className="rounded-lg bg-muted p-4">
                <h3 className="mb-2 text-sm font-medium">{t("answers")}</h3>
                <div className="space-y-2 text-sm">
                  {proposal.answers.map((answer) => (
                    <div key={answer.questionId}>
                      <span className="font-medium">{answer.label}: </span>
                      <span className="text-muted-foreground">{answer.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <h3 className="font-medium mb-3">{t("proposedSlots")}</h3>
              <div className="grid gap-3 md:grid-cols-3">
                {proposal.proposedSlots.map((slot, index) => {
                  const slotDate = new Date(slot)
                  const isSelected =
                    proposal.selectedSlot && new Date(proposal.selectedSlot).getTime() === slotDate.getTime()

                  return (
                    <div
                      key={index}
                      className={`rounded-lg border p-4 ${isSelected ? "border-primary bg-primary/5" : "border-border"}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                          {t("option", { number: index + 1 })}
                        </div>
                        {isSelected && (
                          <Badge variant="secondary" className="text-xs">
                            <Check className="h-3 w-3 me-1" />
                            {t("selected")}
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="font-medium text-sm">
                          {formatInTimeZone(slotDate, timezone, { weekday: "long", month: "long", day: "numeric" }, locale)}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatInTimeZone(slotDate, timezone, { hour: "numeric", minute: "2-digit" }, locale)}
                        </div>
                      </div>
                      {proposal.status === "pending" && (
                        <Button
                          className="w-full mt-3"
                          size="sm"
                          onClick={() => handleAccept(proposal.id, slotDate)}
                          disabled={acceptingId === proposal.id}
                        >
                          {acceptingId === proposal.id ? (
                            <><Loader2 className="h-4 w-4 me-1 animate-spin" />{t("creating")}</>
                          ) : (
                            <><Check className="h-4 w-4 me-1" />{t("accept")}</>
                          )}
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
            {proposal.status === "pending" && (
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => handleReject(proposal.id)}>
                  <X className="h-4 w-4 me-1" />
                  {t("rejectAll")}
                </Button>
              </div>
            )}
            {proposal.status === "accepted" && proposal.selectedSlot && (
              <div className="rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-green-100 dark:bg-green-900 p-2">
                    <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-green-900 dark:text-green-100 mb-1">{t("meetingConfirmed")}</h4>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      {t("meetingConfirmedDesc", {
                        date: formatInTimeZone(proposal.selectedSlot, timezone, {
                          weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit",
                        }, locale),
                        timezone,
                      })}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
