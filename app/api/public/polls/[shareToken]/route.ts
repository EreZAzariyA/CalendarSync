import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { connectToDatabase } from "@/lib/mongodb"
import { Poll } from "@/lib/models/Poll"
import type { IPoll } from "@/lib/models/Poll"
import { MeetingType } from "@/lib/models/MeetingType"
import { normalizeAnswers, validateAnswers } from "@/lib/scheduling"
import { toMeetingTypeDTO } from "@/lib/meeting-types"

interface RouteContext {
  params: Promise<{ shareToken: string }>
}

const voteSchema = z.object({
  participantName: z.string().min(2).max(100),
  participantEmail: z.string().email(),
  selectedSlots: z.array(z.string().datetime()).min(1).max(10),
  answers: z
    .array(
      z.object({
        questionId: z.string(),
        label: z.string(),
        value: z.string(),
      }),
    )
    .optional(),
})

function publicPoll(poll: (IPoll & { _id: unknown }) | null) {
  if (!poll) return null
  return {
    id: String(poll._id),
    title: poll.title,
    description: poll.description,
    organizerName: poll.organizerName,
    candidateSlots: poll.candidateSlots,
    votes: poll.votes.map((vote) => ({
      participantName: vote.participantName,
      participantEmail: vote.participantEmail,
      selectedSlots: vote.selectedSlots,
    })),
    status: poll.status,
    deadline: poll.deadline,
    selectedSlot: poll.selectedSlot,
  }
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { shareToken } = await context.params
  await connectToDatabase()
  const poll = await Poll.findOne({ shareToken })
  if (!poll) {
    return NextResponse.json({ error: "Poll not found" }, { status: 404 })
  }

  const meetingType = await MeetingType.findById(poll.meetingTypeId)
  return NextResponse.json({
    poll: publicPoll(poll),
    meetingType: meetingType ? toMeetingTypeDTO(meetingType) : null,
  })
}

export async function POST(request: NextRequest, context: RouteContext) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = voteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid vote", details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const { shareToken } = await context.params
  await connectToDatabase()
  const poll = await Poll.findOne({ shareToken })
  if (!poll || poll.status !== "open") {
    return NextResponse.json({ error: "Poll is not open" }, { status: 404 })
  }

  if (poll.deadline && poll.deadline < new Date()) {
    return NextResponse.json({ error: "Poll deadline has passed" }, { status: 410 })
  }

  const normalizedEmail = parsed.data.participantEmail.toLowerCase()
  const alreadyVoted = poll.votes.some((vote) => vote.participantEmail.toLowerCase() === normalizedEmail)
  if (alreadyVoted) {
    return NextResponse.json({ error: "This email has already voted" }, { status: 409 })
  }

  const meetingType = await MeetingType.findById(poll.meetingTypeId)
  if (!meetingType) {
    return NextResponse.json({ error: "Meeting type not found" }, { status: 404 })
  }

  const selectedSlots = parsed.data.selectedSlots.map((slot) => new Date(slot))
  const invalidSlot = selectedSlots.some(
    (selected) => !poll.candidateSlots.some((candidate) => candidate.getTime() === selected.getTime()),
  )
  if (invalidSlot) {
    return NextResponse.json({ error: "One or more selected slots are invalid" }, { status: 400 })
  }

  const meetingTypeDTO = toMeetingTypeDTO(meetingType)
  const answers = normalizeAnswers(meetingTypeDTO.customQuestions, parsed.data.answers || [])
  const answerErrors = validateAnswers(meetingTypeDTO.customQuestions, answers)
  if (Object.keys(answerErrors).length > 0) {
    return NextResponse.json({ error: "Missing required answers", details: answerErrors }, { status: 400 })
  }

  poll.votes.push({
    participantName: parsed.data.participantName,
    participantEmail: normalizedEmail,
    selectedSlots,
    answers,
    createdAt: new Date(),
  })
  await poll.save()

  return NextResponse.json({ poll: publicPoll(poll) }, { status: 201 })
}
