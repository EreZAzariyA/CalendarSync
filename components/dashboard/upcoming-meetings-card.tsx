"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CardInfoTooltip } from "@/components/dashboard/card-info-tooltip"
import { useRouter } from "next/navigation"
import type { MeetingProposal } from "@/lib/proposals"
import { useTranslations } from "next-intl"

export function UpcomingMeetingsCard() {
  const [proposals, setProposals] = useState<MeetingProposal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const t = useTranslations("meetingsCard")
  const tCommon = useTranslations("common")

  useEffect(() => {
    fetchProposals()
  }, [])

  const fetchProposals = async () => {
    try {
      const response = await fetch("/api/proposals")
      const data = await response.json()
      setProposals(data.proposals || [])
    } catch {
      setProposals([])
    } finally {
      setIsLoading(false)
    }
  }

  const pendingProposals = proposals.filter((p) => p.status === "pending")

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          {t("title")}
        </CardTitle>
        <CardInfoTooltip label={tCommon("moreInfo")} content={t("tooltip")} />
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col flex-1">
        {isLoading ? (
          <div className="flex flex-1 items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="flex-1">
              {pendingProposals.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">{t("noPending")}</div>
              ) : (
                <div className="text-sm font-medium">
                  {pendingProposals.length === 1
                    ? t("pendingCount", { count: 1 })
                    : t("pendingCountPlural", { count: pendingProposals.length })}
                </div>
              )}
            </div>
            <Button className="w-full bg-transparent mt-3" variant="outline" onClick={() => router.push("/proposals")}>
              {t("reviewProposals")}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
