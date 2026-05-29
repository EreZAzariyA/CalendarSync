import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getServerSession } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { User } from "@/lib/models/User"
import { normalizeUserSettings } from "@/lib/user-settings"

const settingsSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
  timezone: z.string().min(1).max(100),
  defaultMeetingDuration: z.coerce.number().int().positive().max(1440),
  emailNotifications: z.boolean(),
  browserNotifications: z.boolean(),
  autoAcceptMeetings: z.boolean(),
  locale: z.enum(["en", "he"]),
  availability: z.object({
    workingDays: z.array(z.coerce.number().int().min(0).max(6)).min(1).max(7),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
    slotIntervalMinutes: z.coerce.number().int().min(5).max(240),
    minNoticeMinutes: z.coerce.number().int().min(0).max(10080),
    bufferBeforeMinutes: z.coerce.number().int().min(0).max(240),
    bufferAfterMinutes: z.coerce.number().int().min(0).max(240),
    rollingWindowDays: z.coerce.number().int().min(1).max(365),
    maxBookingsPerDay: z.coerce.number().int().min(1).max(50),
  }),
})

export async function GET() {
  const session = await getServerSession()

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    await connectToDatabase()
    const user = await User.findById(session.user.id).lean()

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ settings: normalizeUserSettings(user.settings) })
  } catch (error) {
    console.error("Failed to fetch settings:", error)
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
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

  const parsed = settingsSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid settings", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  try {
    await connectToDatabase()
    const user = await User.findByIdAndUpdate(
      session.user.id,
      { $set: { settings: parsed.data } },
      { new: true, runValidators: true },
    ).lean()

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ settings: normalizeUserSettings(user.settings) })
  } catch (error) {
    console.error("Failed to save settings:", error)
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 })
  }
}
