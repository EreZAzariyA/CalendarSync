import { SignInForm } from "@/components/auth/sign-in-form"
import { getTranslations } from "next-intl/server"

export default async function SignInPage() {
  const t = await getTranslations("auth")

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-background dark:via-background dark:to-background">
      <div className="w-full max-w-md px-6">
        <div className="mb-8 text-center">
          <h1 className="font-sans text-4xl font-bold tracking-tight text-foreground">CalendarSync</h1>
          <p className="mt-2 text-muted-foreground">{t("appTagline")}</p>
        </div>
        <SignInForm />
      </div>
    </div>
  )
}
