# CalendarSync

CalendarSync is a Next.js app for sharing Google Calendar availability and collecting meeting proposals. Users sign in with Google, get a private share link, and review proposed meeting times from a dashboard.

## Features

- Google OAuth sign-in
- Google Calendar event and free/busy integration
- Public availability pages at `/share/[token]`
- Meeting types with direct booking, proposal, or group poll modes
- Global availability defaults with per-meeting-type overrides
- Custom intake questions per meeting type
- Meeting proposal submission and review
- Confirmed booking records for direct bookings and accepted proposals or polls
- QR code and iframe embed sharing for meeting type links
- Calendar event creation after accepting a proposal
- User settings for theme, language, timezone, meeting duration, and notifications
- Optional email notifications through Resend
- English and Hebrew localization

## Tech Stack

- Next.js 15 App Router
- React 19
- TypeScript
- Tailwind CSS
- Radix UI primitives
- MongoDB with Mongoose
- Google OAuth 2.0 and Google Calendar API
- next-intl for localization
- next-themes for light/dark/system theme support

## Getting Started

### Prerequisites

- Node.js 18 or newer
- MongoDB connection string
- Google Cloud project with OAuth credentials
- Google Calendar API enabled

### Install Dependencies

```bash
npm install
```

### Configure Environment

Create `.env.local` in the project root. Use `.env.example` as the template.

```env
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority

GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

NEXT_PUBLIC_APP_URL=http://localhost:3000

RESEND_API_KEY=
EMAIL_FROM=CalendarSync <onboarding@resend.dev>
```

`RESEND_API_KEY` is optional. If it is not set, email sending is skipped and the app still works.

### Google OAuth Setup

In Google Cloud Console:

1. Create or select a project.
2. Enable the Google Calendar API.
3. Create OAuth 2.0 credentials.
4. Add redirect URIs:
   - `http://localhost:3000/api/auth/callback`
   - `https://your-domain.com/api/auth/callback`
5. Copy the client ID and secret into `.env.local`.

### Run Locally

```bash
npm run dev
```

Open `http://localhost:3000`.

## App Routes

- `/` - entry route
- `/auth/signin` - Google sign-in page
- `/dashboard` - signed-in user dashboard
- `/meeting-types` - create and manage scheduling links
- `/availability` - calendar and availability view
- `/proposals` - meeting proposal review
- `/settings` - theme, language, notification, and calendar preferences
- `/profile` - account profile
- `/share/[token]` - public scheduling page for a user's availability link
- `/share/[token]/[slug]` - direct public link to one meeting type
- `/polls/[shareToken]` - public group poll voting page

## API Routes

- `GET /api/auth/google` - start Google OAuth
- `GET /api/auth/callback` - handle Google OAuth callback
- `POST /api/auth/logout` - clear the session
- `GET /api/calendar/events` - load signed-in user's calendar events
- `GET /api/calendar/freebusy` - load signed-in user's busy periods
- `GET /api/calendar/freebusy/[shareToken]` - load public busy periods for a share link
- `GET /api/availability/[shareToken]/[slug]` - load available slots for one public meeting type
- `POST /api/calendar/create-event` - create a Google Calendar event
- `GET /api/meeting-types` - list meeting types
- `POST /api/meeting-types` - create a meeting type
- `GET /api/meeting-types/[id]` - load a meeting type
- `PATCH /api/meeting-types/[id]` - update or disable a meeting type
- `POST /api/meeting-types/[id]/duplicate` - copy a meeting type
- `POST /api/bookings` - create a confirmed direct booking
- `GET /api/polls` - list group polls
- `POST /api/polls` - create a group poll
- `PATCH /api/polls/[id]` - close or finalize a group poll
- `GET /api/public/polls/[shareToken]` - load public poll details
- `POST /api/public/polls/[shareToken]` - submit a poll vote
- `GET /api/proposals` - list proposals for the signed-in organizer
- `POST /api/proposals` - submit a new proposal
- `GET /api/proposals/[id]` - load a proposal
- `PUT /api/proposals/[id]` - accept or reject a proposal
- `GET /api/user/share-token` - get the signed-in user's share token
- `POST /api/user/regenerate-share-token` - regenerate the share token
- `POST /api/user/fix-share-token` - backfill a missing share token
- `GET /api/user/settings` - load user settings
- `PUT /api/user/settings` - update user settings
- `PUT /api/user/locale` - update user locale

## Project Structure

```text
app/
  api/                 API routes
  auth/                authentication pages
  availability/        calendar availability page
  dashboard/           signed-in dashboard
  profile/             profile page
  proposals/           proposal review page
  settings/            user settings page
  share/[token]/       public scheduling page
components/
  auth/                auth UI
  availability/        calendar UI
  dashboard/           dashboard cards and header
  profile/             profile UI
  proposals/           proposal UI
  settings/            settings UI
  share/               public scheduling UI
  ui/                  reusable primitives
i18n/                  next-intl request config
lib/
  models/              Mongoose models
  auth.ts              session helpers
  google-calendar.ts   Google Calendar integration
  mongodb.ts           database connection
  proposals.ts         proposal helpers
  user-settings.ts     settings helpers
messages/              locale dictionaries
```

## Scripts

```bash
npm run dev      # start the local Next.js dev server
npm run build    # create a production build
npm run start    # start the production server
npm run lint     # run linting
```

## Data Models

### User

Users are stored in MongoDB with Google identity fields, OAuth tokens, a unique share token, and settings.

```ts
{
  googleId: string
  email: string
  name: string
  picture?: string
  accessToken: string
  refreshToken?: string
  tokenExpiresAt?: Date
  shareToken: string
  settings: {
    theme: "light" | "dark" | "system"
    timezone: string
    defaultMeetingDuration: number
    emailNotifications: boolean
    browserNotifications: boolean
    autoAcceptMeetings: boolean
    locale: "en" | "he"
  }
}
```

### Proposal

Proposals track the organizer, proposer, suggested time slots, status, selected slot, and optional calendar event ID.

```ts
{
  organizerId: string
  organizerName: string
  proposerName: string
  proposerEmail: string
  proposedSlots: Date[]
  status: "pending" | "accepted" | "rejected"
  selectedSlot?: Date
  calendarEventId?: string
}
```

## Notes

- Sessions are stored in an HTTP-only cookie named `calendar_sync_session`.
- Public share pages use the user's `shareToken`; calendar event details are not exposed.
- Email delivery is best effort and optional.
- Theme and locale settings are stored per user.
