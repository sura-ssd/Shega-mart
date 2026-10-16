"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import { useState } from "react"
import { ArrowLeft, ArrowRight, KeyRound, Mail } from "lucide-react"
import { usePlatformPreferences } from "@/components/providers/platform-preferences-provider"

export default function ForgotPasswordPage() {
  const { t } = usePlatformPreferences()
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const configuredRedirect = process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL?.trim()
      const redirectTo = (() => {
        if (!configuredRedirect) {
          return `${window.location.origin}/auth/reset-password`
        }

        try {
          return new URL("/auth/reset-password", configuredRedirect).toString()
        } catch {
          return `${window.location.origin}/auth/reset-password`
        }
      })()

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      })

      if (error) throw error

      // Always show the same success state whether or not the email exists,
      // so we don't leak which addresses have an account.
      setIsSubmitted(true)
    } catch (error: unknown) {
      // Still show the generic success screen to avoid revealing account existence,
      // unless it's a rate limit or validation issue worth surfacing.
      if (error instanceof Error && /rate limit|too many/i.test(error.message)) {
        setError(t("auth.tooManyAttempts"))
      } else {
        setIsSubmitted(true)
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md border-primary/20 shadow-2xl">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
              <CardTitle className="text-2xl font-bold">{t("auth.checkYourEmail")}</CardTitle>
              <CardDescription className="mt-2 text-base">
                {t("auth.forgotPasswordSuccessDesc", { email })}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-border/70 bg-background/60 p-4 text-sm text-muted-foreground shadow-sm">
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>{t("auth.linkExpiresNotice")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>{t("auth.checkSpamNotice")}</span>
                </li>
              </ul>
            </div>
            <div className="flex flex-col gap-3 pt-2">
              <Button asChild className="w-full shadow-lg shadow-primary/20">
                <Link href="/auth/login">{t("auth.backToSignIn")}</Link>
              </Button>
              <Button
                variant="outline"
                className="w-full bg-transparent"
                onClick={() => setIsSubmitted(false)}
              >
                {t("auth.useDifferentEmail")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <KeyRound className="h-6 w-6 text-primary" />
          </div>
          <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4 text-center">
            <CardTitle className="text-center text-2xl font-bold tracking-tight">{t("auth.forgotYourPassword")}</CardTitle>
            <CardDescription className="mt-2 text-center text-sm sm:text-base">
              {t("auth.forgotPasswordDesc")}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-2xl border border-border/70 bg-background/60 p-4 shadow-sm">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold">
                  {t("auth.emailAddress")}
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 border-border/80 bg-background/70 shadow-sm"
                />
              </div>
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="h-12 w-full text-base font-semibold shadow-lg shadow-primary/20" disabled={isLoading}>
              {isLoading ? t("auth.sendingLink") : t("auth.sendResetLink")}
              {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm">
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-1 font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("auth.backToSignIn")}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}