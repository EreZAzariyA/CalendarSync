"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, Plus, Loader2 } from "lucide-react"
import { useState } from "react"
import { useRouter } from "next/navigation"

export function AvailabilityCard() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSetupAvailability = () => {
    setIsLoading(true)
    router.push("/availability")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Your Availability
        </CardTitle>
        <CardDescription>Connect your Google Calendar to share your availability</CardDescription>
      </CardHeader>
      <CardContent>
        <Button className="w-full" onClick={handleSetupAvailability} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              View Calendar
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
