import { Schema, model, models, type Model } from "mongoose"
import { randomBytes } from "crypto"
import { DEFAULT_AVAILABILITY_RULES, type AvailabilityRules } from "@/lib/scheduling"

export type Theme = "light" | "dark" | "system"
export type Locale = "en" | "he"

export interface IUserSettings {
  theme: Theme
  timezone: string
  defaultMeetingDuration: number
  emailNotifications: boolean
  browserNotifications: boolean
  autoAcceptMeetings: boolean
  locale: Locale
  availability: AvailabilityRules
}

export const DEFAULT_USER_SETTINGS: IUserSettings = {
  theme: "system",
  timezone: "UTC",
  defaultMeetingDuration: 60,
  emailNotifications: true,
  browserNotifications: false,
  autoAcceptMeetings: false,
  locale: "en",
  availability: DEFAULT_AVAILABILITY_RULES,
}

export interface IUser {
  googleId: string
  email: string
  name: string
  picture?: string
  accessToken: string
  refreshToken?: string
  tokenExpiresAt?: Date
  shareToken: string
  settings: IUserSettings
  createdAt: Date
  updatedAt: Date
}

const SettingsSchema = new Schema<IUserSettings>(
  {
    theme: { type: String, enum: ["light", "dark", "system"], default: DEFAULT_USER_SETTINGS.theme },
    timezone: { type: String, default: DEFAULT_USER_SETTINGS.timezone },
    defaultMeetingDuration: { type: Number, default: DEFAULT_USER_SETTINGS.defaultMeetingDuration },
    emailNotifications: { type: Boolean, default: DEFAULT_USER_SETTINGS.emailNotifications },
    browserNotifications: { type: Boolean, default: DEFAULT_USER_SETTINGS.browserNotifications },
    autoAcceptMeetings: { type: Boolean, default: DEFAULT_USER_SETTINGS.autoAcceptMeetings },
    locale: { type: String, enum: ["en", "he"], default: DEFAULT_USER_SETTINGS.locale },
    availability: {
      workingDays: { type: [Number], default: DEFAULT_AVAILABILITY_RULES.workingDays },
      startTime: { type: String, default: DEFAULT_AVAILABILITY_RULES.startTime },
      endTime: { type: String, default: DEFAULT_AVAILABILITY_RULES.endTime },
      slotIntervalMinutes: { type: Number, default: DEFAULT_AVAILABILITY_RULES.slotIntervalMinutes },
      minNoticeMinutes: { type: Number, default: DEFAULT_AVAILABILITY_RULES.minNoticeMinutes },
      bufferBeforeMinutes: { type: Number, default: DEFAULT_AVAILABILITY_RULES.bufferBeforeMinutes },
      bufferAfterMinutes: { type: Number, default: DEFAULT_AVAILABILITY_RULES.bufferAfterMinutes },
      rollingWindowDays: { type: Number, default: DEFAULT_AVAILABILITY_RULES.rollingWindowDays },
      maxBookingsPerDay: { type: Number, default: DEFAULT_AVAILABILITY_RULES.maxBookingsPerDay },
    },
  },
  { _id: false },
)

const UserSchema = new Schema<IUser>(
  {
    googleId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    picture: {
      type: String,
      required: false,
    },
    accessToken: {
      type: String,
      required: true,
    },
    refreshToken: {
      type: String,
      required: false,
    },
    tokenExpiresAt: {
      type: Date,
      required: false,
    },
    shareToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
      default: () => randomBytes(32).toString('hex'),
    },
    settings: {
      type: SettingsSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  },
)

export const User = (models.User as Model<IUser>) || model<IUser>("User", UserSchema)
