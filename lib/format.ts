/**
 * Formats a date in a specific IANA time zone using the platform Intl API
 * (works on both server and client, no extra dependency). Falls back to the
 * runtime's default zone if an invalid time zone is supplied.
 */
export function formatInTimeZone(
  date: Date | string,
  timeZone: string,
  options: Intl.DateTimeFormatOptions = { dateStyle: "full", timeStyle: "short" },
  locale = "en-US",
): string {
  const d = typeof date === "string" ? new Date(date) : date
  const intlLocale = locale === "he" ? "he-IL" : locale
  try {
    return new Intl.DateTimeFormat(intlLocale, { ...options, timeZone }).format(d)
  } catch {
    return new Intl.DateTimeFormat(intlLocale, options).format(d)
  }
}
