import Link from "next/link"
import { CalendarClock } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { MeetingTypeDTO } from "@/lib/meeting-types"

interface ShareEntryViewProps {
  organizerName: string
  shareToken: string
  meetingTypes: MeetingTypeDTO[]
}

export async function ShareEntryView({ organizerName, shareToken, meetingTypes }: ShareEntryViewProps) {
  const t = await getTranslations("shareEntry")

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">{t("title", { name: organizerName })}</h1>
        <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {meetingTypes.map((meetingType) => (
          <Card key={meetingType.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="h-5 w-5 text-primary" />
                {meetingType.title}
              </CardTitle>
              <CardDescription>{meetingType.description || `${meetingType.durationMinutes} minute meeting`}</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">
                {meetingType.durationMinutes} min · {meetingType.bookingMode}
              </div>
              <Button asChild>
                <Link href={`/share/${shareToken}/${meetingType.slug}`}>{t("open")}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
