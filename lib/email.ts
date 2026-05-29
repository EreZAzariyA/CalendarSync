import { formatInTimeZone } from "@/lib/format"
import { formatMessage, getStaticMessages, normalizeStaticLocale } from "@/lib/i18n-static"

const RESEND_API_KEY = process.env.RESEND_API_KEY
const EMAIL_FROM = process.env.EMAIL_FROM || "CalendarSync <onboarding@resend.dev>"
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

interface SendEmailInput {
  to: string
  subject: string
  html: string
}

/**
 * Sends an email via the Resend REST API. If RESEND_API_KEY is not configured
 * this is a no-op (logs a warning and returns false) so the app works fully
 * without email set up. All callers treat sending as best-effort.
 */
export async function sendEmail({ to, subject, html }: SendEmailInput): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.warn(`[email] RESEND_API_KEY not set — skipping email to ${to} ("${subject}")`)
    return false
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: EMAIL_FROM, to, subject, html }),
    })

    if (!res.ok) {
      console.error(`[email] Resend responded ${res.status}: ${await res.text()}`)
      return false
    }

    return true
  } catch (error) {
    console.error("[email] Failed to send:", error)
    return false
  }
}

function layout(heading: string, body: string, locale?: string | null): string {
  const copy = getStaticMessages(locale).email
  const dir = normalizeStaticLocale(locale) === "he" ? "rtl" : "ltr"

  return `
  <div dir="${dir}" style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;color:#1f2937">
    <h2 style="color:#2563eb">${heading}</h2>
    ${body}
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0" />
    <p style="font-size:12px;color:#6b7280">${copy.sentBy} · <a href="${APP_URL}" style="color:#2563eb">${APP_URL}</a></p>
  </div>`
}

/** Notifies the organizer that a new meeting proposal arrived. */
export async function sendProposalReceivedEmail(params: {
  to: string
  organizerName: string
  proposerName: string
  proposerEmail: string
  slots: Date[]
  timeZone: string
  locale?: string | null
}): Promise<boolean> {
  const copy = getStaticMessages(params.locale).email
  const slotsHtml = params.slots
    .map((slot) => `<li>${formatInTimeZone(slot, params.timeZone, undefined, params.locale || undefined)}</li>`)
    .join("")
  const intro = params.slots.length > 1 ? copy.proposalReceivedIntroMany : copy.proposalReceivedIntroOne

  return sendEmail({
    to: params.to,
    subject: formatMessage(copy.proposalReceivedSubject, { name: params.proposerName }),
    html: layout(
      copy.proposalReceivedHeading,
      `<p>${formatMessage(copy.greeting, { name: params.organizerName })}</p>
       <p>${formatMessage(intro, { name: params.proposerName, email: params.proposerEmail })}</p>
       <ul>${slotsHtml}</ul>
       <p><a href="${APP_URL}/proposals" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">${copy.reviewProposal}</a></p>`,
      params.locale,
    ),
  })
}

/** Notifies the proposer that the organizer accepted or rejected their proposal. */
export async function sendProposalDecisionEmail(params: {
  to: string
  proposerName: string
  organizerName: string
  status: "accepted" | "rejected"
  selectedSlot?: Date
  timeZone: string
  locale?: string | null
}): Promise<boolean> {
  const copy = getStaticMessages(params.locale).email
  const accepted = params.status === "accepted"
  const when = params.selectedSlot
    ? formatInTimeZone(params.selectedSlot, params.timeZone, undefined, params.locale || undefined)
    : ""

  return sendEmail({
    to: params.to,
    subject: accepted
      ? formatMessage(copy.proposalAcceptedSubject, { name: params.organizerName })
      : copy.proposalDeclinedSubject,
    html: layout(
      accepted ? copy.proposalAcceptedHeading : copy.proposalDeclinedHeading,
      accepted
        ? `<p>${formatMessage(copy.greeting, { name: params.proposerName })}</p>
           <p>${formatMessage(copy.proposalAcceptedBody, { name: params.organizerName })}</p>
           <p style="font-size:16px;font-weight:600">${when} <span style="font-weight:400;color:#6b7280">(${params.timeZone})</span></p>
           <p>${copy.calendarInviteSent}</p>`
        : `<p>${formatMessage(copy.greeting, { name: params.proposerName })}</p>
           <p>${formatMessage(copy.proposalDeclinedBody, { name: params.organizerName })}</p>`,
      params.locale,
    ),
  })
}

export async function sendBookingConfirmationEmail(params: {
  to: string
  name: string
  organizerName: string
  meetingTitle: string
  slot: Date
  timeZone: string
  location?: string
  locale?: string | null
}): Promise<boolean> {
  const copy = getStaticMessages(params.locale).email
  const when = formatInTimeZone(params.slot, params.timeZone, undefined, params.locale || undefined)
  const location = params.location ? `<p>${formatMessage(copy.locationLine, { location: params.location })}</p>` : ""

  return sendEmail({
    to: params.to,
    subject: formatMessage(copy.bookingConfirmationSubject, { title: params.meetingTitle, name: params.organizerName }),
    html: layout(
      copy.bookingConfirmationHeading,
      `<p>${formatMessage(copy.greeting, { name: params.name })}</p>
       <p>${formatMessage(copy.bookingConfirmationBody, { title: params.meetingTitle, name: params.organizerName })}</p>
       <p style="font-size:16px;font-weight:600">${when} <span style="font-weight:400;color:#6b7280">(${params.timeZone})</span></p>
       ${location}
       <p>${copy.calendarInviteSent}</p>`,
      params.locale,
    ),
  })
}

export async function sendOrganizerBookingEmail(params: {
  to: string
  organizerName: string
  inviteeName: string
  inviteeEmail: string
  meetingTitle: string
  slot: Date
  timeZone: string
  locale?: string | null
}): Promise<boolean> {
  const copy = getStaticMessages(params.locale).email
  return sendEmail({
    to: params.to,
    subject: formatMessage(copy.organizerBookingSubject, { title: params.meetingTitle }),
    html: layout(
      copy.organizerBookingHeading,
      `<p>${formatMessage(copy.greeting, { name: params.organizerName })}</p>
       <p>${formatMessage(copy.organizerBookingBody, { name: params.inviteeName, email: params.inviteeEmail, title: params.meetingTitle })}</p>
       <p style="font-size:16px;font-weight:600">${formatInTimeZone(params.slot, params.timeZone, undefined, params.locale || undefined)} <span style="font-weight:400;color:#6b7280">(${params.timeZone})</span></p>`,
      params.locale,
    ),
  })
}
