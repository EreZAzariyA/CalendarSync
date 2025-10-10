import { redirect } from "next/navigation"
import { getServerSession } from "@/lib/auth"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { CalendarView } from "@/components/availability/calendar-view"

export default async function AvailabilityPage() {
  const session = await getServerSession()

  if (!session) {
    redirect("/auth/signin")
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader user={session.user} />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Your Calendar</h1>
          <p className="text-muted-foreground mt-2">View your schedule and manage your availability</p>
        </div>
        <CalendarView />
      </main>
    </div>
  )
}
