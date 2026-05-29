import { randomBytes } from "crypto"
import { Schema, model, models, type Model } from "mongoose"
import type { CustomAnswer } from "@/lib/scheduling"

export interface IPollVote {
  participantName: string
  participantEmail: string
  selectedSlots: Date[]
  answers: CustomAnswer[]
  createdAt: Date
}

export interface IPoll {
  organizerId: string
  organizerName: string
  meetingTypeId: string
  title: string
  description?: string
  shareToken: string
  candidateSlots: Date[]
  votes: IPollVote[]
  status: "open" | "finalized" | "closed"
  deadline?: Date
  selectedSlot?: Date
  bookingId?: string
  createdAt: Date
  updatedAt: Date
}

const AnswerSchema = new Schema<CustomAnswer>(
  {
    questionId: { type: String, required: true },
    label: { type: String, required: true },
    value: { type: String, required: true },
  },
  { _id: false },
)

const PollVoteSchema = new Schema<IPollVote>(
  {
    participantName: { type: String, required: true },
    participantEmail: { type: String, required: true },
    selectedSlots: { type: [Date], required: true },
    answers: { type: [AnswerSchema], default: () => [] },
    createdAt: { type: Date, default: () => new Date() },
  },
  { _id: false },
)

const PollSchema = new Schema<IPoll>(
  {
    organizerId: { type: String, required: true, index: true },
    organizerName: { type: String, required: true },
    meetingTypeId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    description: String,
    shareToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
      default: () => randomBytes(24).toString("hex"),
    },
    candidateSlots: { type: [Date], required: true },
    votes: { type: [PollVoteSchema], default: () => [] },
    status: { type: String, enum: ["open", "finalized", "closed"], default: "open", index: true },
    deadline: Date,
    selectedSlot: Date,
    bookingId: String,
  },
  { timestamps: true },
)

export const Poll = (models.Poll as Model<IPoll>) || model<IPoll>("Poll", PollSchema)
