import { SignInForm } from "@/components/auth/sign-in-form"

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="w-full max-w-md px-6">
        <div className="mb-8 text-center">
          <h1 className="font-sans text-4xl font-bold tracking-tight text-foreground">CalendarSync</h1>
          <p className="mt-2 text-muted-foreground">Share your availability and schedule meetings effortlessly</p>
        </div>
        <SignInForm />
      </div>
    </div>
  )
}
