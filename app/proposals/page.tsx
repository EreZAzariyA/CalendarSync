import { redirect } from "next/navigation"
import { getServerSession } from "@/lib/auth"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { ProposalsList } from "@/components/proposals/proposals-list"

export default async function ProposalsPage() {
  const session = await getServerSession()

  if (!session) {
    redirect("/auth/signin")
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader user={session.user} />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Meeting Proposals</h1>
          <p className="text-muted-foreground mt-2">Review and confirm meeting requests</p>
        </div>
        <ProposalsList />
      </main>
    </div>
  )
}
