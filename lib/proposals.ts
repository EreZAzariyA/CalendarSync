import { connectToDatabase } from "./mongodb"
import { Proposal } from "./models/Proposal"

export interface MeetingProposal {
  id: string
  organizerId: string
  organizerName: string
  proposerName: string
  proposerEmail: string
  proposedSlots: Date[]
  status: "pending" | "accepted" | "rejected"
  selectedSlot?: Date
  createdAt: Date
}

export async function createProposal(
  proposal: Omit<MeetingProposal, "id" | "createdAt" | "status">,
): Promise<MeetingProposal> {
  await connectToDatabase()

  const newProposal = await Proposal.create({
    ...proposal,
    status: "pending",
  })

  return {
    id: newProposal._id.toString(),
    organizerId: newProposal.organizerId,
    organizerName: newProposal.organizerName,
    proposerName: newProposal.proposerName,
    proposerEmail: newProposal.proposerEmail,
    proposedSlots: newProposal.proposedSlots,
    status: newProposal.status,
    selectedSlot: newProposal.selectedSlot,
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
    proposerName: p.proposerName,
    proposerEmail: p.proposerEmail,
    proposedSlots: p.proposedSlots,
    status: p.status,
    selectedSlot: p.selectedSlot,
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
    proposerName: proposal.proposerName,
    proposerEmail: proposal.proposerEmail,
    proposedSlots: proposal.proposedSlots,
    status: proposal.status,
    selectedSlot: proposal.selectedSlot,
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
    proposerName: proposal.proposerName,
    proposerEmail: proposal.proposerEmail,
    proposedSlots: proposal.proposedSlots,
    status: proposal.status,
    selectedSlot: proposal.selectedSlot,
    createdAt: proposal.createdAt,
  }
}
