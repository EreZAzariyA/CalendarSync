import { Schema, model, models, type Model } from "mongoose"
import {
  DEFAULT_AVAILABILITY_RULES,
  type AvailabilityOverrides,
  type BookingMode,
  type CustomQuestion,
} from "@/lib/scheduling"

export interface IMeetingType {
  ownerId: string
  slug: string
  title: string
  description?: string
  active: boolean
  bookingMode: BookingMode
  durationMinutes: number
  location?: string
  availabilityOverrides: AvailabilityOverrides
  customQuestions: CustomQuestion[]
  shareMetadata: {
    welcomeMessage?: string
  }
  createdAt: Date
  updatedAt: Date
}

const AvailabilityOverridesSchema = new Schema<AvailabilityOverrides>(
  {
    workingDays: [{ type: Number }],
    startTime: String,
    endTime: String,
    slotIntervalMinutes: Number,
    minNoticeMinutes: Number,
    bufferBeforeMinutes: Number,
    bufferAfterMinutes: Number,
    rollingWindowDays: Number,
    maxBookingsPerDay: Number,
  },
  { _id: false },
)

const CustomQuestionSchema = new Schema<CustomQuestion>(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    type: { type: String, enum: ["text", "textarea", "phone"], default: "text" },
    required: { type: Boolean, default: false },
  },
  { _id: false },
)

const MeetingTypeSchema = new Schema<IMeetingType>(
  {
    ownerId: { type: String, required: true, index: true },
    slug: { type: String, required: true },
    title: { type: String, required: true },
    description: String,
    active: { type: Boolean, default: true },
    bookingMode: { type: String, enum: ["direct", "proposal", "poll"], default: "proposal" },
    durationMinutes: { type: Number, default: 60, min: 5, max: 480 },
    location: String,
    availabilityOverrides: {
      type: AvailabilityOverridesSchema,
      default: () => ({
        slotIntervalMinutes: DEFAULT_AVAILABILITY_RULES.slotIntervalMinutes,
      }),
    },
    customQuestions: { type: [CustomQuestionSchema], default: () => [] },
    shareMetadata: {
      welcomeMessage: String,
    },
  },
  { timestamps: true },
)

MeetingTypeSchema.index({ ownerId: 1, slug: 1 }, { unique: true })

export const MeetingType =
  (models.MeetingType as Model<IMeetingType>) || model<IMeetingType>("MeetingType", MeetingTypeSchema)
