import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getServerSession } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { Poll } from "@/lib/models/Poll"
import { getMeetingTypeById } from "@/lib/meeting-types"

const createPollSchema = z.object({
  meetingTypeId: z.string().min(1),
  title: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  candidateSlots: z.array(z.string().datetime()).min(2).max(10),
  deadline: z.string().datetime().optional(),
})

export async function GET() {
  const session = await getServerSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  await connectToDatabase()
  const polls = await Poll.find({ organizerId: session.user.id }).sort({ createdAt: -1 }).lean()
  return NextResponse.json({
    polls: polls.map((poll) => ({ ...poll, id: poll._id.toString(), _id: undefined })),
  })
}

export async function POST(request: NextRequest) {
  const session = await getServerSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = createPollSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid poll", details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const meetingType = await getMeetingTypeById(session.user.id, parsed.data.meetingTypeId)
  if (!meetingType || meetingType.bookingMode !== "poll") {
    return NextResponse.json({ error: "Meeting type is not available for polls" }, { status: 400 })
  }

  await connectToDatabase()
  const poll = await Poll.create({
    organizerId: session.user.id,
    organizerName: session.user.name,
    meetingTypeId: meetingType.id,
    title: parsed.data.title,
    description: parsed.data.description,
    candidateSlots: parsed.data.candidateSlots.map((slot) => new Date(slot)),
    deadline: parsed.data.deadline ? new Date(parsed.data.deadline) : undefined,
    status: "open",
  })

  return NextResponse.json({ poll: { ...poll.toObject(), id: poll._id.toString(), _id: undefined } }, { status: 201 })
}
