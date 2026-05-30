import { type NextRequest, NextResponse } from "next/server"

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const GOOGLE_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/api/auth/callback`
  : "http://localhost:3000/api/auth/callback"

export async function GET(request: NextRequest) {
  try {
    // Validate required environment variables
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      console.error("Missing Google OAuth credentials")
      return NextResponse.redirect(new URL("/auth/signin?error=config_error", request.url))
    }

    // Generate OAuth URL
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: GOOGLE_REDIRECT_URI,
      response_type: "code",
      scope: [
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/calendar.readonly",
        "https://www.googleapis.com/auth/calendar.events",
      ].join(" "),
      access_type: "offline",
      prompt: "select_account",
    })

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`

    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error("OAuth initialization error:", error)
    return NextResponse.redirect(new URL("/auth/signin?error=oauth_init_failed", request.url))
  }
}
