import { connectToDatabase } from "./mongodb"
import { Proposal } from "./models/Proposal"
import type { CustomAnswer } from "@/lib/scheduling"

export interface MeetingProposal {
  id: string
  organizerId: string
  organizerName: string
  meetingTypeId?: string
  meetingTypeTitle?: string
  durationMinutes?: number
  proposerName: string
  proposerEmail: string
  proposedSlots: Date[]
  answers: CustomAnswer[]
  status: "pending" | "accepted" | "rejected"
  selectedSlot?: Date
  calendarEventId?: string
  createdAt: Date
}

export type CreateProposalInput = Omit<MeetingProposal, "id" | "createdAt" | "status" | "answers"> & {
  status?: MeetingProposal["status"]
  answers?: CustomAnswer[]
}

export async function createProposal(proposal: CreateProposalInput): Promise<MeetingProposal> {
  await connectToDatabase()

  const newProposal = await Proposal.create({
    ...proposal,
    status: proposal.status ?? "pending",
  })

  return {
    id: newProposal._id.toString(),
    organizerId: newProposal.organizerId,
    organizerName: newProposal.organizerName,
    meetingTypeId: newProposal.meetingTypeId,
    meetingTypeTitle: newProposal.meetingTypeTitle,
    durationMinutes: newProposal.durationMinutes,
    proposerName: newProposal.proposerName,
    proposerEmail: newProposal.proposerEmail,
    proposedSlots: newProposal.proposedSlots,
    answers: newProposal.answers || [],
    status: newProposal.status,
    selectedSlot: newProposal.selectedSlot,
    calendarEventId: newProposal.calendarEventId,
    createdAt: newProposal.createdAt,
  }
}

export async function getProposalsByOrganizer(organizerId: string): Promise<MeetingProposal[]> {
  await connectToDatabase()

  const proposals = await Proposal.find({ organizerId }).sort({ createdAt: -1 })

  return proposals.map((p) => ({
    id: p._id.toString(),
    organizerId: p.organizerId,
    organizerName: p.organizerName,
    meetingTypeId: p.meetingTypeId,
    meetingTypeTitle: p.meetingTypeTitle,
    durationMinutes: p.durationMinutes,
    proposerName: p.proposerName,
    proposerEmail: p.proposerEmail,
    proposedSlots: p.proposedSlots,
    answers: p.answers || [],
    status: p.status,
    selectedSlot: p.selectedSlot,
    calendarEventId: p.calendarEventId,
    createdAt: p.createdAt,
  }))
}

export async function getProposal(id: string): Promise<MeetingProposal | null> {
  await connectToDatabase()

  const proposal = await Proposal.findById(id)
  if (!proposal) return null

  return {
    id: proposal._id.toString(),
    organizerId: proposal.organizerId,
    organizerName: proposal.organizerName,
    meetingTypeId: proposal.meetingTypeId,
    meetingTypeTitle: proposal.meetingTypeTitle,
    durationMinutes: proposal.durationMinutes,
    proposerName: proposal.proposerName,
    proposerEmail: proposal.proposerEmail,
    proposedSlots: proposal.proposedSlots,
    answers: proposal.answers || [],
    status: proposal.status,
    selectedSlot: proposal.selectedSlot,
    calendarEventId: proposal.calendarEventId,
    createdAt: proposal.createdAt,
  }
}

export async function updateProposal(
  id: string,
  updates: Partial<Omit<MeetingProposal, "id">>,
): Promise<MeetingProposal | null> {
  await connectToDatabase()

  const proposal = await Proposal.findByIdAndUpdate(id, updates, { new: true })
  if (!proposal) return null

  return {
    id: proposal._id.toString(),
    organizerId: proposal.organizerId,
    organizerName: proposal.organizerName,
    meetingTypeId: proposal.meetingTypeId,
    meetingTypeTitle: proposal.meetingTypeTitle,
    durationMinutes: proposal.durationMinutes,
    proposerName: proposal.proposerName,
    proposerEmail: proposal.proposerEmail,
    proposedSlots: proposal.proposedSlots,
    answers: proposal.answers || [],
    status: proposal.status,
    selectedSlot: proposal.selectedSlot,
    calendarEventId: proposal.calendarEventId,
    createdAt: proposal.createdAt,
  }
}
