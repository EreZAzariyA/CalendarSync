import mongoose, { Schema, model, models } from "mongoose"
import type { CustomAnswer } from "@/lib/scheduling"

export interface IProposal {
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
    meetingTypeId: {
      type: String,
      required: false,
      index: true,
    },
    meetingTypeTitle: {
      type: String,
      required: false,
    },
    durationMinutes: {
      type: Number,
      required: false,
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
    answers: {
      type: [
        {
          questionId: { type: String, required: true },
          label: { type: String, required: true },
          value: { type: String, required: true },
        },
      ],
      default: () => [],
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
    calendarEventId: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  },
)

export const Proposal = models.Proposal || model<IProposal>("Proposal", ProposalSchema)
