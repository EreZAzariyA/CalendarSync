"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Share2, Copy, Check, Loader2 } from "lucide-react"
import { useState, useEffect } from "react"
import { toast } from "sonner"

interface ShareLinkCardProps {
  userId: string
  userName: string
}

export function ShareLinkCard({ userId, userName }: ShareLinkCardProps) {
  const [copied, setCopied] = useState(false)
  const [shareUrl, setShareUrl] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [shareToken, setShareToken] = useState<string | null>(null)

  useEffect(() => {
    async function fetchShareToken() {
      try {
        const response = await fetch("/api/user/share-token")
        if (!response.ok) {
          throw new Error("Failed to fetch share token")
        }
        const data = await response.json()
        setShareToken(data.shareToken)
        setShareUrl(`${window.location.origin}/share/${data.shareToken}`)
      } catch (error) {
        console.error("Failed to fetch share token:", error)
        toast.error("Failed to load share link")
      } finally {
        setIsLoading(false)
      }
    }

    fetchShareToken()
  }, [])

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      toast.success("Link copied to clipboard!")
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast.error("Failed to copy link")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share2 className="h-5 w-5" />
          Share Your Availability
        </CardTitle>
        <CardDescription>Let others see when you're available</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs font-mono text-muted-foreground break-all">{shareUrl || "Loading..."}</p>
            </div>
            <Button className="w-full" onClick={handleCopyLink} disabled={!shareUrl}>
              {copied ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Link
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
