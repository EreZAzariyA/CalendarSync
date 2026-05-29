import { connectToDatabase } from "@/lib/mongodb"
import { formatMessage, getStaticMessages } from "@/lib/i18n-static"
import { MeetingType, type IMeetingType } from "@/lib/models/MeetingType"
import type { IUser } from "@/lib/models/User"
import {
  DEFAULT_AVAILABILITY_RULES,
  createQuestionId,
  slugify,
  type AvailabilityOverrides,
  type BookingMode,
  type CustomQuestion,
} from "@/lib/scheduling"

export interface MeetingTypeDTO {
  id: string
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

export interface MeetingTypeInput {
  title: string
  slug?: string
  description?: string
  active?: boolean
  bookingMode?: BookingMode
  durationMinutes?: number
  location?: string
  availabilityOverrides?: AvailabilityOverrides
  customQuestions?: Array<Omit<CustomQuestion, "id"> & { id?: string }>
  shareMetadata?: {
    welcomeMessage?: string
  }
}

export function toMeetingTypeDTO(meetingType: IMeetingType & { _id?: unknown }): MeetingTypeDTO {
  return {
    id: String(meetingType._id),
    ownerId: meetingType.ownerId,
    slug: meetingType.slug,
    title: meetingType.title,
    description: meetingType.description,
    active: meetingType.active,
    bookingMode: meetingType.bookingMode,
    durationMinutes: meetingType.durationMinutes,
    location: meetingType.location,
    availabilityOverrides: meetingType.availabilityOverrides || {},
    customQuestions: meetingType.customQuestions || [],
    shareMetadata: meetingType.shareMetadata || {},
    createdAt: meetingType.createdAt,
    updatedAt: meetingType.updatedAt,
  }
}

export function normalizeMeetingTypeInput(input: MeetingTypeInput): MeetingTypeInput {
  return {
    ...input,
    title: input.title.trim(),
    slug: slugify(input.slug || input.title),
    description: input.description?.trim(),
    location: input.location?.trim(),
    durationMinutes: Math.min(Math.max(Number(input.durationMinutes || 60), 5), 480),
    bookingMode: input.bookingMode || "proposal",
    availabilityOverrides: input.availabilityOverrides || {},
    customQuestions: (input.customQuestions || [])
      .filter((question) => question.label.trim().length > 0)
      .map((question) => ({
        id: question.id || createQuestionId(),
        label: question.label.trim(),
        type: question.type || "text",
        required: Boolean(question.required),
      })),
    shareMetadata: {
      welcomeMessage: input.shareMetadata?.welcomeMessage?.trim(),
    },
  }
}

async function makeUniqueSlug(ownerId: string, desiredSlug: string, excludeId?: string) {
  let slug = desiredSlug
  let suffix = 2

  while (true) {
    const existing = await MeetingType.findOne({ ownerId, slug })
    if (!existing || String(existing._id) === excludeId) return slug
    slug = `${desiredSlug}-${suffix}`
    suffix += 1
  }
}

export async function ensureDefaultMeetingType(user: IUser & { _id?: unknown }) {
  await connectToDatabase()
  const ownerId = String(user._id)
  const copy = getStaticMessages(user.settings?.locale).defaultMeetingType
  const activeCount = await MeetingType.countDocuments({ ownerId, active: true })

  if (activeCount > 0) {
    return null
  }

  const existingDefault = await MeetingType.findOne({ ownerId, slug: "general-meeting" })
  if (existingDefault) {
    existingDefault.active = true
    await existingDefault.save()
    return toMeetingTypeDTO(existingDefault)
  }

  const created = await MeetingType.create({
    ownerId,
    slug: "general-meeting",
    title: copy.title,
    description: copy.description,
    active: true,
    bookingMode: "proposal",
    durationMinutes: user.settings?.defaultMeetingDuration || 60,
    availabilityOverrides: {
      slotIntervalMinutes:
        user.settings?.availability?.slotIntervalMinutes || DEFAULT_AVAILABILITY_RULES.slotIntervalMinutes,
    },
    customQuestions: [],
    shareMetadata: {},
  })

  return toMeetingTypeDTO(created)
}

export async function getMeetingTypesByOwner(ownerId: string, includeInactive = true) {
  await connectToDatabase()
  const query = includeInactive ? { ownerId } : { ownerId, active: true }
  const meetingTypes = await MeetingType.find(query).sort({ active: -1, createdAt: 1 })
  return meetingTypes.map(toMeetingTypeDTO)
}

export async function getActiveMeetingTypesForUser(user: IUser & { _id?: unknown }) {
  await ensureDefaultMeetingType(user)
  return getMeetingTypesByOwner(String(user._id), false)
}

export async function getMeetingTypeById(ownerId: string, id: string) {
  await connectToDatabase()
  const meetingType = await MeetingType.findOne({ _id: id, ownerId })
  return meetingType ? toMeetingTypeDTO(meetingType) : null
}

export async function getPublicMeetingType(ownerId: string, slug: string) {
  await connectToDatabase()
  const meetingType = await MeetingType.findOne({ ownerId, slug, active: true })
  return meetingType ? toMeetingTypeDTO(meetingType) : null
}

export async function createMeetingType(ownerId: string, input: MeetingTypeInput) {
  await connectToDatabase()
  const normalized = normalizeMeetingTypeInput(input)
  const slug = await makeUniqueSlug(ownerId, normalized.slug || slugify(normalized.title))
  const meetingType = await MeetingType.create({ ...normalized, slug, ownerId })
  return toMeetingTypeDTO(meetingType)
}

export async function updateMeetingType(ownerId: string, id: string, input: Partial<MeetingTypeInput>) {
  await connectToDatabase()
  const existing = await MeetingType.findOne({ _id: id, ownerId })
  if (!existing) return null

  const normalized = normalizeMeetingTypeInput({
    title: input.title || existing.title,
    slug: input.slug || existing.slug,
    description: input.description ?? existing.description,
    active: input.active ?? existing.active,
    bookingMode: input.bookingMode || existing.bookingMode,
    durationMinutes: input.durationMinutes || existing.durationMinutes,
    location: input.location ?? existing.location,
    availabilityOverrides: input.availabilityOverrides ?? existing.availabilityOverrides,
    customQuestions: input.customQuestions ?? existing.customQuestions,
    shareMetadata: input.shareMetadata ?? existing.shareMetadata,
  })
  const slug = await makeUniqueSlug(ownerId, normalized.slug || existing.slug, id)

  existing.set({ ...normalized, slug, active: input.active ?? existing.active })
  await existing.save()
  return toMeetingTypeDTO(existing)
}

export async function duplicateMeetingType(ownerId: string, id: string, locale?: string | null) {
  await connectToDatabase()
  const existing = await MeetingType.findOne({ _id: id, ownerId })
  if (!existing) return null
  const copy = getStaticMessages(locale).defaultMeetingType

  return createMeetingType(ownerId, {
    title: formatMessage(copy.copyTitle, { title: existing.title }),
    description: existing.description,
    active: true,
    bookingMode: existing.bookingMode,
    durationMinutes: existing.durationMinutes,
    location: existing.location,
    availabilityOverrides: existing.availabilityOverrides,
    customQuestions: existing.customQuestions,
    shareMetadata: existing.shareMetadata,
  })
}
