"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CardInfoTooltip } from "@/components/dashboard/card-info-tooltip"
import { Calendar, Plus, Loader2 } from "lucide-react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"

export function AvailabilityCard() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const t = useTranslations("availabilityCard")
  const tCommon = useTranslations("common")

  const handleSetupAvailability = () => {
    setIsLoading(true)
    router.push("/availability")
  }

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
        <div className="flex-1" />
        <Button className="w-full" onClick={handleSetupAvailability} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
              {tCommon("loading")}
            </>
          ) : (
            <>
              <Plus className="me-2 h-4 w-4" />
              {t("viewCalendar")}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
