"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import type { MeetingProposal } from "@/lib/proposals"

export function UpcomingMeetingsCard() {
  const [proposals, setProposals] = useState<MeetingProposal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchProposals()
  }, [])

  const fetchProposals = async () => {
    try {
      const response = await fetch("/api/proposals")
      const data = await response.json()
      setProposals(data.proposals || [])
    } catch (error) {
      console.error("Failed to fetch proposals:", error)
      setProposals([])
    } finally {
      setIsLoading(false)
    }
  }

  const pendingProposals = proposals.filter((p) => p.status === "pending")

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Meeting Proposals
        </CardTitle>
        <CardDescription>Pending meeting requests</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : pendingProposals.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">No pending proposals</div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm font-medium">
              {pendingProposals.length} pending {pendingProposals.length === 1 ? "proposal" : "proposals"}
            </div>
            <Button className="w-full bg-transparent" variant="outline" onClick={() => router.push("/proposals")}>
              Review Proposals
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
