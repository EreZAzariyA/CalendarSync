"use client"

import { useTranslations, useLocale } from "next-intl"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Languages } from "lucide-react"
import { useState } from "react"

const LOCALES = [
  { code: "en", flag: "🇺🇸" },
  { code: "he", flag: "🇮🇱" },
] as const

export function LocaleSwitcher() {
  const t = useTranslations("settings")
  const currentLocale = useLocale()
  const [switching, setSwitching] = useState(false)

  const switchLocale = async (locale: string) => {
    if (locale === currentLocale || switching) return
    setSwitching(true)
    try {
      // Set the cookie so next-intl reads it on the next request
      await fetch("/api/user/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      })
      // Persist to user settings (best-effort — cookie is the source of truth)
      fetch("/api/user/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      }).catch(() => {})

      // Full reload so the <html dir> and server translations update
      window.location.reload()
    } catch {
      setSwitching(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full" aria-label={t("language")} disabled={switching}>
          <Languages className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LOCALES.map((loc) => (
          <DropdownMenuItem
            key={loc.code}
            onClick={() => switchLocale(loc.code)}
            className={currentLocale === loc.code ? "font-semibold bg-accent" : ""}
          >
            <span className="mr-2">{loc.flag}</span>
            {t(`locale.${loc.code}`)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
