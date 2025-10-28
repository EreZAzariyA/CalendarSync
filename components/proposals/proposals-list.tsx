"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, Loader2, Check, X, Mail } from "lucide-react"
import { format, addHours } from "date-fns"
import type { MeetingProposal } from "@/lib/proposals"
import { toast } from "sonner"

export function ProposalsList() {
  const [proposals, setProposals] = useState<MeetingProposal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [acceptingId, setAcceptingId] = useState<string | null>(null)

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
    } finally {
      setIsLoading(false)
    }
  }

  const handleAccept = async (proposalId: string, selectedSlot: Date) => {
    setAcceptingId(proposalId)

    try {
      // First, update the proposal status
      const updateResponse = await fetch(`/api/proposals/${proposalId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "accepted",
          selectedSlot: selectedSlot.toISOString(),
        }),
      })

      if (!updateResponse.ok) {
        throw new Error("Failed to accept proposal")
      }

      const { proposal } = await updateResponse.json()

      const startTime = new Date(selectedSlot)
      const endTime = addHours(startTime, 1) // Default 1-hour meeting

      const eventResponse = await fetch("/api/calendar/create-event", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: `Meeting with ${proposal.proposerName}`,
          description: `Meeting scheduled via CalendarSync\n\nAttendee: ${proposal.proposerName} (${proposal.proposerEmail})`,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          attendeeEmail: proposal.proposerEmail,
        }),
      })

      if (!eventResponse.ok) {
        console.error("Failed to create calendar event, but proposal was accepted")
        toast.success("Meeting proposal accepted! (Calendar event creation pending)")
      } else {
        toast.success("Meeting accepted and added to your calendar!")
      }

      fetchProposals()
    } catch (error) {
      console.error("Failed to accept proposal:", error)
      toast.error("Failed to accept proposal")
    } finally {
      setAcceptingId(null)
    }
  }

  const handleReject = async (proposalId: string) => {
    try {
      const response = await fetch(`/api/proposals/${proposalId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "rejected",
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to reject proposal")
      }

      toast.success("Meeting proposal rejected")
      fetchProposals()
    } catch (error) {
      console.error("Failed to reject proposal:", error)
      toast.error("Failed to reject proposal")
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
      <Card className="text-center">
        <CardContent className="py-12">
          <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No proposals yet</h3>
          <p className="text-muted-foreground mb-6">Share your availability link to start receiving meeting proposals.</p>
          <Button href="/share">Create Shareable Link</Button>
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
                  Meeting Request from {proposal.proposerName}
                  <Badge
                    variant={
                      proposal.status === "pending"
                        ? "default"
                        : proposal.status === "accepted"
                          ? "secondary"
                          : "destructive"
                    }
                  >
                    {proposal.status}
                  </Badge>
                </CardTitle>
                <CardDescription className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {proposal.proposerEmail}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(proposal.createdAt), "MMM d, yyyy")}
                  </span>
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-medium mb-3">Proposed Time Slots:</h3>
              <div className="grid gap-3 md:grid-cols-3">
                {proposal.proposedSlots.map((slot, index) => {
                  const slotDate = new Date(slot)
                  const isSelected =
                    proposal.selectedSlot && new Date(proposal.selectedSlot).getTime() === slotDate.getTime()

                  return (
                    <div
                      key={index}
                      className={`rounded-lg border p-4 ${
                        isSelected ? "border-primary bg-primary/5" : "border-border"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                          Option {index + 1}
                        </div>
                        {isSelected && (
                          <Badge variant="secondary" className="text-xs">
                            <Check className="h-3 w-3 mr-1" />
                            Selected
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="font-medium text-sm">{format(slotDate, "EEEE, MMMM d")}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(slotDate, "h:mm a")}
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
                            <>
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            <>
                              <Check className="h-4 w-4 mr-1" />
                              Accept
                            </>
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
                  <X className="h-4 w-4 mr-1" />
                  Reject All
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
                    <h4 className="font-medium text-green-900 dark:text-green-100 mb-1">Meeting Confirmed</h4>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      This meeting has been added to your Google Calendar for{" "}
                      {format(new Date(proposal.selectedSlot), "EEEE, MMMM d 'at' h:mm a")}
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
