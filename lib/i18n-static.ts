import enMessages from "@/messages/en.json"
import heMessages from "@/messages/he.json"

export type StaticLocale = "en" | "he"

const messages = {
  en: enMessages,
  he: heMessages,
} as const

export function normalizeStaticLocale(locale?: string | null): StaticLocale {
  return locale === "he" ? "he" : "en"
}

export function getStaticMessages(locale?: string | null) {
  return messages[normalizeStaticLocale(locale)]
}

export function formatMessage(
  template: string,
  values: Record<string, string | number | null | undefined> = {},
) {
  return template.replace(/\{(\w+)\}/g, (_match, key) => {
    const value = values[key]
    return value === null || value === undefined ? "" : String(value)
  })
}
