"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CardInfoTooltip } from "@/components/dashboard/card-info-tooltip"
import { Share2, Copy, Check, Loader2 } from "lucide-react"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { useTranslations } from "next-intl"

interface ShareLinkCardProps {
  userId: string
  userName: string
}

export function ShareLinkCard({ userId, userName }: ShareLinkCardProps) {
  const [copied, setCopied] = useState(false)
  const [shareUrl, setShareUrl] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const t = useTranslations("shareCard")
  const tCommon = useTranslations("common")

  useEffect(() => {
    async function fetchShareToken() {
      try {
        const response = await fetch("/api/user/share-token")
        if (!response.ok) throw new Error("Failed to fetch share token")
        const data = await response.json()
        setShareUrl(`${window.location.origin}/share/${data.shareToken}`)
      } catch {
        toast.error(t("loadError"))
      } finally {
        setIsLoading(false)
      }
    }
    fetchShareToken()
  }, [t])

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      toast.success(t("copyLink"))
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error(t("copyError"))
    }
  }

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share2 className="h-5 w-5" />
          {t("title")}
        </CardTitle>
        <CardInfoTooltip label={tCommon("moreInfo")} content={t("tooltip")} />
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col flex-1">
        {isLoading ? (
          <div className="flex flex-1 items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-3">
              <div className="rounded-lg bg-muted p-3">
                <p className="text-xs font-mono text-muted-foreground break-all">{shareUrl || "Loading..."}</p>
              </div>
            </div>
            <Button className="w-full mt-3" onClick={handleCopyLink} disabled={!shareUrl}>
              {copied ? (
                <>
                  <Check className="me-2 h-4 w-4" />
                  {t("copied")}
                </>
              ) : (
                <>
                  <Copy className="me-2 h-4 w-4" />
                  {t("copyLink")}
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
