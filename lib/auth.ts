import { cookies } from "next/headers"
import { connectToDatabase } from "./mongodb"
import { User as UserModel } from "./models/User"

export interface User {
  id: string
  email: string
  name: string
  picture?: string
  accessToken: string
  refreshToken: string
}

export interface Session {
  user: User
  expiresAt: number
}

const SESSION_COOKIE_NAME = "calendar_sync_session"

export async function getServerSession(): Promise<Session | null> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)

  if (!sessionCookie) {
    return null
  }

  try {
    const session: Session = JSON.parse(sessionCookie.value)

    // Check if session is expired
    if (Date.now() > session.expiresAt) {
      return null
    }

    // Optionally refresh user data from database
    try {
      await connectToDatabase()

      // Try to find by MongoDB _id first, if that fails try by email (for old sessions)
      let dbUser = null

      // Check if ID looks like a MongoDB ObjectId (24 hex characters)
      if (/^[a-f\d]{24}$/i.test(session.user.id)) {
        dbUser = await UserModel.findById(session.user.id)
      } else {
        // Old session with Google ID, find by email instead
        dbUser = await UserModel.findOne({ email: session.user.email })
      }

      if (dbUser) {
        // Update session with latest user data from DB
        session.user = {
          id: dbUser._id.toString(),
          email: dbUser.email,
          name: dbUser.name,
          picture: dbUser.picture,
          accessToken: dbUser.accessToken,
          refreshToken: dbUser.refreshToken || "",
        }
      }
    } catch (dbError) {
      // If DB fails, continue with cached session data
      console.error("Failed to refresh user from DB:", dbError)
    }

    return session
  } catch {
    return null
  }
}

export async function setServerSession(session: Session) {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, JSON.stringify(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  })
}

export async function clearServerSession() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
}
