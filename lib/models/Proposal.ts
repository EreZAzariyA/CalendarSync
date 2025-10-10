import mongoose, { Schema, model, models } from "mongoose"

export interface IProposal {
  organizerId: string
  organizerName: string
  proposerName: string
  proposerEmail: string
  proposedSlots: Date[]
  status: "pending" | "accepted" | "rejected"
  selectedSlot?: Date
  createdAt: Date
}

const ProposalSchema = new Schema<IProposal>(
  {
    organizerId: {
      type: String,
      required: true,
      index: true,
    },
    organizerName: {
      type: String,
      required: true,
    },
    proposerName: {
      type: String,
      required: true,
    },
    proposerEmail: {
      type: String,
      required: true,
    },
    proposedSlots: {
      type: [Date],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
    selectedSlot: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: true,
  },
)

export const Proposal = models.Proposal || model<IProposal>("Proposal", ProposalSchema)
