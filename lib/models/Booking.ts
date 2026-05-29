import { Schema, model, models, type Model } from "mongoose"
import type { CustomAnswer } from "@/lib/scheduling"

export interface IBooking {
  organizerId: string
  organizerName: string
  meetingTypeId?: string
  meetingTypeTitle: string
  inviteeName: string
  inviteeEmail: string
  attendees: Array<{ name?: string; email: string }>
  answers: CustomAnswer[]
  start: Date
  end: Date
  timeZone: string
  location?: string
  status: "confirmed" | "cancelled"
  source: "direct" | "proposal" | "poll"
  sourceId?: string
  calendarEventId?: string
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

const BookingSchema = new Schema<IBooking>(
  {
    organizerId: { type: String, required: true, index: true },
    organizerName: { type: String, required: true },
    meetingTypeId: { type: String, index: true },
    meetingTypeTitle: { type: String, required: true },
    inviteeName: { type: String, required: true },
    inviteeEmail: { type: String, required: true },
    attendees: {
      type: [
        {
          name: String,
          email: { type: String, required: true },
        },
      ],
      default: () => [],
    },
    answers: { type: [AnswerSchema], default: () => [] },
    start: { type: Date, required: true, index: true },
    end: { type: Date, required: true },
    timeZone: { type: String, required: true },
    location: String,
    status: { type: String, enum: ["confirmed", "cancelled"], default: "confirmed", index: true },
    source: { type: String, enum: ["direct", "proposal", "poll"], required: true },
    sourceId: String,
    calendarEventId: String,
  },
  { timestamps: true },
)

BookingSchema.index({ organizerId: 1, start: 1, status: 1 })

export const Booking = (models.Booking as Model<IBooking>) || model<IBooking>("Booking", BookingSchema)
