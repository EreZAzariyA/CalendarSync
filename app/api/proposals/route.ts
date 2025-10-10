import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import { createProposal, getProposalsByOrganizer } from "@/lib/proposals"
import { connectToDatabase } from "@/lib/mongodb"
import { Proposal } from "@/lib/models/Proposal"

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { organizerId, organizerName, proposerName, proposerEmail, proposedSlots } = body

    // Validate required fields
    if (!organizerId || !proposerName || !proposerEmail || !proposedSlots || proposedSlots.length === 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Validate email format
    if (!EMAIL_REGEX.test(proposerEmail)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
    }

    // Validate proposer name length
    if (proposerName.length < 2 || proposerName.length > 100) {
      return NextResponse.json({ error: "Name must be between 2 and 100 characters" }, { status: 400 })
    }

    // Validate number of proposed slots (max 5)
    if (proposedSlots.length > 5) {
      return NextResponse.json({ error: "Maximum 5 time slots allowed" }, { status: 400 })
    }

    // Basic rate limiting: Check for recent proposals from same email
    // Limit to 5 proposals per email per day
    await connectToDatabase()
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const recentProposals = await Proposal.countDocuments({
      proposerEmail,
      createdAt: { $gte: oneDayAgo }
    })

    if (recentProposals >= 5) {
      return NextResponse.json({
        error: "Rate limit exceeded. Maximum 5 proposals per day per email."
      }, { status: 429 })
    }

    // NOTE: For production deployment, consider implementing:
    // - IP-based rate limiting using libraries like @upstash/ratelimit
    // - CAPTCHA verification to prevent automated spam
    // - Redis-based distributed rate limiting for scalability

    const proposal = await createProposal({
      organizerId,
      organizerName,
      proposerName,
      proposerEmail,
      proposedSlots: proposedSlots.map((slot: string) => new Date(slot)),
    })

    return NextResponse.json({ proposal })
  } catch (error) {
    console.error("Failed to create proposal:", error)
    return NextResponse.json({ error: "Failed to create proposal" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const session = await getServerSession()

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const proposals = await getProposalsByOrganizer(session.user.id)
    
    return NextResponse.json({ proposals })
  } catch (error) {
    console.error("Failed to fetch proposals:", error)
    return NextResponse.json({ error: "Failed to fetch proposals" }, { status: 500 })
  }
}
