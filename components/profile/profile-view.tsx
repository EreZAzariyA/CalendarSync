"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { User, Mail, Calendar, Shield } from "lucide-react"
import type { User as UserType } from "@/lib/auth"
import { useTranslations } from "next-intl"

interface ProfileViewProps {
  user: UserType
}

export function ProfileView({ user }: ProfileViewProps) {
  const t = useTranslations("profile")

  return (
    <div className="max-w-4xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("personalInfoTitle")}</CardTitle>
          <CardDescription>{t("personalInfoDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={user.picture || "/placeholder.svg"} alt={user.name} />
              <AvatarFallback className="text-2xl">
                {user.name.split(" ").map((n) => n[0]).join("").toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-2xl font-bold">{user.name}</h3>
              <p className="text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">
                <User className="inline h-4 w-4 me-2" />
                {t("fullName")}
              </Label>
              <Input id="name" value={user.name} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">
                <Mail className="inline h-4 w-4 me-2" />
                {t("emailAddress")}
              </Label>
              <Input id="email" value={user.email} disabled />
            </div>
          </div>

          <div className="rounded-lg bg-muted p-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-sm">{t("connectedTitle")}</h4>
                <p className="text-xs text-muted-foreground mt-1">{t("connectedDesc")}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("calendarTitle")}</CardTitle>
          <CardDescription>{t("calendarDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium text-sm">{t("googleCalendar")}</h4>
                <p className="text-xs text-muted-foreground">{t("connected")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-xs text-muted-foreground">{t("active")}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("actionsTitle")}</CardTitle>
          <CardDescription>{t("actionsDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" className="w-full justify-start" disabled>
            <User className="me-2 h-4 w-4" />
            {t("updatePicture")}
            <span className="ms-auto text-xs text-muted-foreground">{t("comingSoon")}</span>
          </Button>
          <Button variant="outline" className="w-full justify-start" disabled>
            <Shield className="me-2 h-4 w-4" />
            {t("privacySettings")}
            <span className="ms-auto text-xs text-muted-foreground">{t("comingSoon")}</span>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
