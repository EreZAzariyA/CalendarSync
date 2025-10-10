import { type NextRequest, NextResponse } from "next/server"
import { setServerSession } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import { User } from "@/lib/models/User"
import { randomBytes } from "crypto"

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const GOOGLE_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`
  : "http://localhost:3000/api/auth/callback"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const error = searchParams.get("error")

  if (error || !code) {
    return NextResponse.redirect(new URL("/auth/signin?error=oauth_failed", request.url))
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID || "",
        client_secret: GOOGLE_CLIENT_SECRET || "",
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    })

    if (!tokenResponse.ok) {
      throw new Error("Failed to exchange code for tokens")
    }

    const tokens = await tokenResponse.json()

    // Get user info
    const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    })

    if (!userInfoResponse.ok) {
      throw new Error("Failed to fetch user info")
    }

    const userInfo = await userInfoResponse.json()

    // Connect to database and save/update user
    await connectToDatabase()

    const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000)

    // Find existing user or create new one
    let user = await User.findOne({ googleId: userInfo.id })

    if (user) {
      // Update existing user with new tokens
      user.email = userInfo.email
      user.name = userInfo.name
      user.picture = userInfo.picture
      user.accessToken = tokens.access_token
      user.refreshToken = tokens.refresh_token || user.refreshToken
      user.tokenExpiresAt = tokenExpiresAt

      // Ensure shareToken exists (for existing users that don't have it yet)
      if (!user.shareToken) {
        user.shareToken = randomBytes(32).toString('hex')
      }

      await user.save()
    } else {
      // Create new user
      user = await User.create({
        googleId: userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt,
        shareToken: randomBytes(32).toString('hex'),
      })
    }

    // Create session with MongoDB user ID
    const session = {
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        picture: user.picture,
        accessToken: user.accessToken,
        refreshToken: user.refreshToken || "",
      },
      expiresAt: Date.now() + tokens.expires_in * 1000,
    }

    await setServerSession(session)

    return NextResponse.redirect(new URL("/dashboard", request.url))
  } catch (error) {
    console.error("OAuth callback error:", error)
    return NextResponse.redirect(new URL("/auth/signin?error=oauth_failed", request.url))
  }
}
