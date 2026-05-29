import { PollVoteView } from "@/components/polls/poll-vote-view"

interface PollPageProps {
  params: Promise<{ shareToken: string }>
}

export default async function PollPage({ params }: PollPageProps) {
  const { shareToken } = await params

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-background dark:via-background dark:to-background">
      <div className="container mx-auto px-4 py-8">
        <PollVoteView shareToken={shareToken} />
      </div>
    </div>
  )
}
