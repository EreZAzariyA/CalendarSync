import { enUS, he } from "date-fns/locale"

export function getDateFnsLocale(locale?: string) {
  return locale === "he" ? he : enUS
}

export function getIntlLocale(locale?: string) {
  return locale === "he" ? "he-IL" : "en-US"
}
