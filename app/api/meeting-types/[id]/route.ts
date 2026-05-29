import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getServerSession } from "@/lib/auth"
import { getMeetingTypeById, updateMeetingType } from "@/lib/meeting-types"

interface RouteContext {
  params: Promise<{ id: string }>
}

const patchSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  slug: z.string().max(80).optional(),
  description: z.string().max(500).optional(),
  active: z.boolean().optional(),
  bookingMode: z.enum(["direct", "proposal", "poll"]).optional(),
  durationMinutes: z.coerce.number().int().min(5).max(480).optional(),
  location: z.string().max(200).optional(),
  availabilityOverrides: z
    .object({
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
    .optional(),
  customQuestions: z
    .array(
      z.object({
        id: z.string().optional(),
        label: z.string().min(1).max(120),
        type: z.enum(["text", "textarea", "phone"]).default("text"),
        required: z.boolean().default(false),
      }),
    )
    .max(10)
    .optional(),
  shareMetadata: z.object({ welcomeMessage: z.string().max(300).optional() }).optional(),
})

export async function GET(_request: NextRequest, context: RouteContext) {
  const session = await getServerSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params
  const meetingType = await getMeetingTypeById(session.user.id, id)
  if (!meetingType) {
    return NextResponse.json({ error: "Meeting type not found" }, { status: 404 })
  }

  return NextResponse.json({ meetingType })
}

export async function PATCH(request: NextRequest, context: RouteContext) {
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

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid meeting type", details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const { id } = await context.params
  const meetingType = await updateMeetingType(session.user.id, id, parsed.data)
  if (!meetingType) {
    return NextResponse.json({ error: "Meeting type not found" }, { status: 404 })
  }

  return NextResponse.json({ meetingType })
}
