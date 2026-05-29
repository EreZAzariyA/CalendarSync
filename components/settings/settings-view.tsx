"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Bell, Calendar, Clock, Mail, Moon, Sun, Globe, Save, Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import type { IUserSettings, Theme } from "@/lib/models/User"
import { LocaleSwitcher } from "@/components/locale-switcher"

interface SettingsViewProps {
  initialSettings: IUserSettings
}

export function SettingsView({ initialSettings }: SettingsViewProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const t = useTranslations("settings")

  const [emailNotifications, setEmailNotifications] = useState(initialSettings.emailNotifications)
  const [browserNotifications, setBrowserNotifications] = useState(initialSettings.browserNotifications)
  const [autoAcceptMeetings, setAutoAcceptMeetings] = useState(initialSettings.autoAcceptMeetings)
  const [defaultMeetingDuration, setDefaultMeetingDuration] = useState(String(initialSettings.defaultMeetingDuration))
  const [timezone, setTimezone] = useState(initialSettings.timezone)
  const [availability, setAvailability] = useState(initialSettings.availability)
  const [isSaving, setIsSaving] = useState(false)
  const dayOptions = [
    [0, t("days.sun")],
    [1, t("days.mon")],
    [2, t("days.tue")],
    [3, t("days.wed")],
    [4, t("days.thu")],
    [5, t("days.fri")],
    [6, t("days.sat")],
  ] as const

  useEffect(() => setMounted(true), [])
  const selectedTheme: Theme = (mounted ? (theme as Theme) : initialSettings.theme) ?? "system"

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const res = await fetch("/api/user/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theme: selectedTheme,
          timezone,
          defaultMeetingDuration: Number(defaultMeetingDuration),
          emailNotifications,
          browserNotifications,
          autoAcceptMeetings,
          locale: initialSettings.locale,
          availability,
        }),
      })
      if (!res.ok) throw new Error("Request failed")
      toast.success(t("saveSuccess"))
    } catch {
      toast.error(t("saveError"))
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEmailNotifications(initialSettings.emailNotifications)
    setBrowserNotifications(initialSettings.browserNotifications)
    setAutoAcceptMeetings(initialSettings.autoAcceptMeetings)
    setDefaultMeetingDuration(String(initialSettings.defaultMeetingDuration))
    setTimezone(initialSettings.timezone)
    setAvailability(initialSettings.availability)
    setTheme(initialSettings.theme)
  }

  const toggleWorkingDay = (day: number) => {
    setAvailability((current) => {
      const next = current.workingDays.includes(day)
        ? current.workingDays.filter((value) => value !== day)
        : [...current.workingDays, day].sort()
      return { ...current, workingDays: next.length > 0 ? next : current.workingDays }
    })
  }

  const updateAvailability = (key: keyof typeof availability, value: string | number) => {
    setAvailability((current) => ({ ...current, [key]: value }))
  }

  return (
    <div className="max-w-4xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("notificationsTitle")}</CardTitle>
          <CardDescription>{t("notificationsDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="email-notifications" className="text-base font-medium cursor-pointer">
                  {t("emailNotifications")}
                </Label>
                <p className="text-sm text-muted-foreground">{t("emailNotificationsDesc")}</p>
              </div>
            </div>
            <Switch id="email-notifications" checked={emailNotifications} onCheckedChange={setEmailNotifications} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="browser-notifications" className="text-base font-medium cursor-pointer">
                  {t("browserNotifications")}
                </Label>
                <p className="text-sm text-muted-foreground">{t("browserNotificationsDesc")}</p>
              </div>
            </div>
            <Switch id="browser-notifications" checked={browserNotifications} onCheckedChange={setBrowserNotifications} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("calendarTitle")}</CardTitle>
          <CardDescription>{t("calendarDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="timezone">
              <Globe className="inline h-4 w-4 me-2" />
              {t("timezone")}
            </Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger id="timezone"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="UTC">{t("timezones.utc")}</SelectItem>
                <SelectItem value="America/New_York">{t("timezones.newYork")}</SelectItem>
                <SelectItem value="America/Chicago">{t("timezones.chicago")}</SelectItem>
                <SelectItem value="America/Los_Angeles">{t("timezones.losAngeles")}</SelectItem>
                <SelectItem value="Europe/London">{t("timezones.london")}</SelectItem>
                <SelectItem value="Europe/Paris">{t("timezones.paris")}</SelectItem>
                <SelectItem value="Asia/Tokyo">{t("timezones.tokyo")}</SelectItem>
                <SelectItem value="Asia/Jerusalem">{t("timezones.jerusalem")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="default-duration">
              <Clock className="inline h-4 w-4 me-2" />
              {t("defaultDuration")}
            </Label>
            <Select value={defaultMeetingDuration} onValueChange={setDefaultMeetingDuration}>
              <SelectTrigger id="default-duration"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="15">{t("min15")}</SelectItem>
                <SelectItem value="30">{t("min30")}</SelectItem>
                <SelectItem value="60">{t("hour1")}</SelectItem>
                <SelectItem value="90">{t("hour15")}</SelectItem>
                <SelectItem value="120">{t("hour2")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-4">
            <div>
              <h4 className="text-base font-medium">{t("availabilityRulesTitle")}</h4>
              <p className="text-sm text-muted-foreground">
                {t("availabilityRulesDesc")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {dayOptions.map(([day, label]) => (
                <Button
                  key={day}
                  type="button"
                  size="sm"
                  variant={availability.workingDays.includes(Number(day)) ? "default" : "outline"}
                  onClick={() => toggleWorkingDay(Number(day))}
                >
                  {label}
                </Button>
              ))}
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="availability-start">{t("startTime")}</Label>
                <Input id="availability-start" type="time" value={availability.startTime} onChange={(event) => updateAvailability("startTime", event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="availability-end">{t("endTime")}</Label>
                <Input id="availability-end" type="time" value={availability.endTime} onChange={(event) => updateAvailability("endTime", event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slot-interval">{t("slotInterval")}</Label>
                <Input id="slot-interval" type="number" value={availability.slotIntervalMinutes} onChange={(event) => updateAvailability("slotIntervalMinutes", Number(event.target.value))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="min-notice">{t("minNotice")}</Label>
                <Input id="min-notice" type="number" value={availability.minNoticeMinutes} onChange={(event) => updateAvailability("minNoticeMinutes", Number(event.target.value))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="buffer-before">{t("bufferBefore")}</Label>
                <Input id="buffer-before" type="number" value={availability.bufferBeforeMinutes} onChange={(event) => updateAvailability("bufferBeforeMinutes", Number(event.target.value))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="buffer-after">{t("bufferAfter")}</Label>
                <Input id="buffer-after" type="number" value={availability.bufferAfterMinutes} onChange={(event) => updateAvailability("bufferAfterMinutes", Number(event.target.value))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="booking-window">{t("bookingWindow")}</Label>
                <Input id="booking-window" type="number" value={availability.rollingWindowDays} onChange={(event) => updateAvailability("rollingWindowDays", Number(event.target.value))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max-bookings">{t("maxBookings")}</Label>
                <Input id="max-bookings" type="number" value={availability.maxBookingsPerDay} onChange={(event) => updateAvailability("maxBookingsPerDay", Number(event.target.value))} />
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="auto-accept" className="text-base font-medium cursor-pointer">
                  {t("autoAccept")}
                </Label>
                <p className="text-sm text-muted-foreground">{t("autoAcceptDesc")}</p>
              </div>
            </div>
            <Switch id="auto-accept" checked={autoAcceptMeetings} onCheckedChange={setAutoAcceptMeetings} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("appearanceTitle")}</CardTitle>
          <CardDescription>{t("appearanceDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="theme">{t("theme")}</Label>
            <Select value={selectedTheme} onValueChange={(v) => setTheme(v)}>
              <SelectTrigger id="theme"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="light">
                  <div className="flex items-center gap-2"><Sun className="h-4 w-4" />{t("themeLight")}</div>
                </SelectItem>
                <SelectItem value="dark">
                  <div className="flex items-center gap-2"><Moon className="h-4 w-4" />{t("themeDark")}</div>
                </SelectItem>
                <SelectItem value="system">{t("themeSystem")}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">{t("themeHint")}</p>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>{t("language")}</Label>
            <div className="flex items-center gap-3">
              <LocaleSwitcher />
              <p className="text-sm text-muted-foreground">{t("languageHint")}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("sharingTitle")}</CardTitle>
          <CardDescription>{t("sharingDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4">
            <h4 className="font-medium text-sm mb-2">{t("publicLinkTitle")}</h4>
            <p className="text-xs text-muted-foreground">{t("publicLinkDesc")}</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
          {t("cancel")}
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <><Loader2 className="me-2 h-4 w-4 animate-spin" />{t("saving")}</>
          ) : (
            <><Save className="me-2 h-4 w-4" />{t("save")}</>
          )}
        </Button>
      </div>
    </div>
  )
}
