import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import { getProposal, updateProposal } from "@/lib/proposals"
import { connectToDatabase } from "@/lib/mongodb"
import { User } from "@/lib/models/User"

interface RouteContext {
  params: Promise<{
    id: string
  }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params

  try {
    const proposal = await getProposal(id)

    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 })
    }

    return NextResponse.json({ proposal })
  } catch (error) {
    console.error("Failed to fetch proposal:", error)
    return NextResponse.json({ error: "Failed to fetch proposal" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await getServerSession()

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params

  try {
    const body = await request.json()
    const proposal = await getProposal(id)

    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 })
    }

    // Check if user owns this proposal
    // organizerId might be MongoDB _id or old Google ID, so we need to check both
    await connectToDatabase()
    const currentUser = await User.findById(session.user.id)

    let isOwner = proposal.organizerId === session.user.id

    // If not a direct match, check if the organizerId is a Google ID that matches current user
    if (!isOwner && currentUser) {
      const proposalOwner = await User.findOne({ googleId: proposal.organizerId })
      if (proposalOwner && proposalOwner._id.toString() === session.user.id) {
        isOwner = true
      }
    }

    if (!isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const updated = await updateProposal(id, body)
    return NextResponse.json({ proposal: updated })
  } catch (error) {
    console.error("Failed to update proposal:", error)
    return NextResponse.json({ error: "Failed to update proposal" }, { status: 500 })
  }
}
