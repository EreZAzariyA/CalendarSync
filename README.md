# CalendarSync

A modern web application that allows users to share their Google Calendar availability and schedule meetings effortlessly. Built with Next.js 15, TypeScript, and MongoDB.

## Features

- 🔐 **Google OAuth Authentication** - Secure sign-in with Google accounts
- 📅 **Calendar Integration** - Real-time Google Calendar availability checking
- 🔗 **Shareable Links** - Generate unique tokens to share your availability
- 📝 **Meeting Proposals** - Allow others to propose meeting times
- 📊 **Dashboard** - Comprehensive overview of your calendar and proposals
- 🎨 **Modern UI** - Beautiful, responsive design with Tailwind CSS
- 📱 **Mobile Friendly** - Optimized for all device sizes

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, Radix UI components
- **Backend**: Next.js API Routes
- **Database**: MongoDB with Mongoose
- **Authentication**: Google OAuth 2.0
- **Calendar API**: Google Calendar API
- **Deployment**: Vercel (recommended)

## Prerequisites

Before running this project, make sure you have:

- Node.js 18+ installed
- MongoDB database (local or cloud)
- Google Cloud Console project with Calendar API enabled
- Google OAuth 2.0 credentials

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/calendar-sync
# or for MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/calendar-sync

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# App URL (for production)
NEXT_PUBLIC_APP_URL=https://your-domain.com
# For development, this can be omitted (defaults to localhost:3000)
```

## Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Calendar API
4. Go to "Credentials" and create OAuth 2.0 Client ID
5. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback` (development)
   - `https://your-domain.com/api/auth/callback` (production)
6. Copy the Client ID and Client Secret to your `.env.local` file

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd calendar-scheduler
```

2. Install dependencies:
```bash
npm install
# or
pnpm install
```

3. Set up your environment variables (see above)

4. Run the development server:
```bash
npm run dev
# or
pnpm dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
calendar-scheduler/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── auth/          # Authentication endpoints
│   │   ├── calendar/      # Calendar operations
│   │   ├── proposals/     # Meeting proposals
│   │   └── user/          # User management
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Main dashboard
│   ├── share/             # Public sharing pages
│   └── ...                # Other pages
├── components/            # React components
│   ├── auth/              # Authentication components
│   ├── dashboard/         # Dashboard components
│   ├── share/             # Sharing components
│   └── ui/                # Reusable UI components
├── lib/                   # Utility libraries
│   ├── models/            # Database models
│   ├── auth.ts            # Authentication utilities
│   ├── google-calendar.ts # Google Calendar API client
│   ├── mongodb.ts         # Database connection
│   └── proposals.ts       # Proposal management
└── hooks/                 # Custom React hooks
```

## Key Features Explained

### Authentication Flow
- Users sign in with Google OAuth 2.0
- Access tokens are stored securely in HTTP-only cookies
- Session management with automatic token refresh

### Calendar Integration
- Real-time availability checking using Google Calendar API
- Free/busy time detection
- Event creation and management

### Sharing System
- Each user gets a unique share token
- Public pages allow others to view availability
- Meeting proposals can be submitted through shared links

### Proposal Management
- Users can propose multiple meeting times
- Organizers can accept/reject proposals
- Automatic calendar event creation upon acceptance

## API Endpoints

### Authentication
- `GET /api/auth/google` - Initiate Google OAuth
- `GET /api/auth/callback` - Handle OAuth callback
- `POST /api/auth/logout` - Sign out user

### Calendar
- `GET /api/calendar/events` - Get user's calendar events
- `GET /api/calendar/freebusy` - Get availability data
- `POST /api/calendar/create-event` - Create calendar event

### Proposals
- `GET /api/proposals` - Get user's proposals
- `POST /api/proposals` - Create new proposal
- `GET /api/proposals/[id]` - Get specific proposal
- `PUT /api/proposals/[id]` - Update proposal status

### User Management
- `GET /api/user/share-token` - Get user's share token
- `POST /api/user/regenerate-share-token` - Generate new token
- `POST /api/user/fix-share-token` - Fix token issues

## Database Schema

### User Model
```typescript
{
  googleId: string
  email: string
  name: string
  picture?: string
  accessToken: string
  refreshToken?: string
  tokenExpiresAt?: Date
  shareToken: string
  createdAt: Date
  updatedAt: Date
}
```

### Proposal Model
```typescript
{
  organizerId: string
  organizerName: string
  proposerName: string
  proposerEmail: string
  proposedSlots: Date[]
  status: "pending" | "accepted" | "rejected"
  selectedSlot?: Date
  createdAt: Date
}
```

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically on every push

### Other Platforms

The app can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- Render
- DigitalOcean App Platform

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit your changes: `git commit -am 'Add feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

If you encounter any issues or have questions:

1. Check the existing issues on GitHub
2. Create a new issue with detailed information
3. Include error messages and steps to reproduce

## Roadmap

- [ ] Email notifications for proposals
- [ ] Calendar sync with other providers (Outlook, Apple)
- [ ] Advanced scheduling rules and preferences
- [ ] Team/group scheduling features
- [ ] Mobile app (React Native)
- [ ] API rate limiting and optimization
- [ ] Enhanced UI/UX improvements

---

Built with ❤️ using Next.js, TypeScript, and modern web technologies.
