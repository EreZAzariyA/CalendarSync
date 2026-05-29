import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getServerSession } from "@/lib/auth"
import { createMeetingType, getMeetingTypesByOwner } from "@/lib/meeting-types"

const questionSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1).max(120),
  type: z.enum(["text", "textarea", "phone"]).default("text"),
  required: z.boolean().default(false),
})

const availabilitySchema = z.object({
  workingDays: z.array(z.coerce.number().int().min(0).max(6)).min(1).max(7).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  slotIntervalMinutes: z.coerce.number().int().min(5).max(240).optional(),
  minNoticeMinutes: z.coerce.number().int().min(0).max(10080).optional(),
  bufferBeforeMinutes: z.coerce.number().int().min(0).max(240).optional(),
  bufferAfterMinutes: z.coerce.number().int().min(0).max(240).optional(),
  rollingWindowDays: z.coerce.number().int().min(1).max(365).optional(),
  maxBookingsPerDay: z.coerce.number().int().min(1).max(50).optional(),
})

const meetingTypeSchema = z.object({
  title: z.string().min(1).max(120),
  slug: z.string().max(80).optional(),
  description: z.string().max(500).optional(),
  active: z.boolean().optional(),
  bookingMode: z.enum(["direct", "proposal", "poll"]).default("proposal"),
  durationMinutes: z.coerce.number().int().min(5).max(480),
  location: z.string().max(200).optional(),
  availabilityOverrides: availabilitySchema.optional(),
  customQuestions: z.array(questionSchema).max(10).optional(),
  shareMetadata: z.object({ welcomeMessage: z.string().max(300).optional() }).optional(),
})

export async function GET() {
  const session = await getServerSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const meetingTypes = await getMeetingTypesByOwner(session.user.id, true)
  return NextResponse.json({ meetingTypes })
}

export async function POST(request: NextRequest) {
  const session = await getServerSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = meetingTypeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid meeting type", details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  try {
    const meetingType = await createMeetingType(session.user.id, parsed.data)
    return NextResponse.json({ meetingType }, { status: 201 })
  } catch (error) {
    console.error("Failed to create meeting type:", error)
    return NextResponse.json({ error: "Failed to create meeting type" }, { status: 500 })
  }
}
