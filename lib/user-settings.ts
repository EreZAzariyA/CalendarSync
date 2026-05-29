import { connectToDatabase } from "@/lib/mongodb"
import { User, DEFAULT_USER_SETTINGS, type IUserSettings } from "@/lib/models/User"
import { normalizeAvailabilityRules } from "@/lib/scheduling"

export function normalizeUserSettings(settings?: Partial<IUserSettings> | null): IUserSettings {
  return {
    ...DEFAULT_USER_SETTINGS,
    ...settings,
    availability: normalizeAvailabilityRules(settings?.availability),
  }
}

/**
 * Loads a user's settings (merged with defaults) for server components.
 * Falls back to defaults if the user can't be loaded so pages never crash.
 */
export async function getUserSettings(userId: string): Promise<IUserSettings> {
  try {
    await connectToDatabase()
    const user = await User.findById(userId).lean()
    if (user?.settings) {
      return normalizeUserSettings(user.settings)
    }
  } catch (error) {
    console.error("Failed to load user settings:", error)
  }
  return normalizeUserSettings()
}
