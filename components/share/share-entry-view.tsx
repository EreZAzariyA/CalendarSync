import Link from "next/link"
import { ArrowRight, Clock } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import type { MeetingTypeDTO } from "@/lib/meeting-types"

interface ShareEntryViewProps {
  organizerName: string
  shareToken: string
  meetingTypes: MeetingTypeDTO[]
}

export async function ShareEntryView({ organizerName, shareToken, meetingTypes }: ShareEntryViewProps) {
  const t = await getTranslations("shareEntry")
  const initials = organizerName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="flex flex-col items-center py-6 px-4">
      <div className="flex flex-col items-center gap-4 mb-10">
        <div className="h-20 w-20 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold shadow-lg select-none">
          {initials}
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">{organizerName}</h1>
          <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>

      <div className="w-full max-w-3xl grid gap-4 sm:grid-cols-2">
        {meetingTypes.map((meetingType) => (
          <Link key={meetingType.id} href={`/share/${shareToken}/${meetingType.slug}`}>
            <Card className="h-full hover:shadow-md hover:border-primary/50 transition-all cursor-pointer group">
              <CardContent className="p-6 flex flex-col gap-3 h-full">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold text-lg leading-tight">{meetingType.title}</h2>
                  <ArrowRight className="h-4 w-4 shrink-0 mt-1 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                {meetingType.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{meetingType.description}</p>
                )}
                <div className="flex items-center gap-2 mt-auto pt-2">
                  <Badge variant="secondary" className="gap-1">
                    <Clock className="h-3 w-3" />
                    {meetingType.durationMinutes} min
                  </Badge>
                  <Badge variant="outline" className="capitalize">
                    {meetingType.bookingMode}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
