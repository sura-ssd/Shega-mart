"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { ArrowRight, CheckCircle2, KeyRound, Loader2, ShieldAlert } from "lucide-react"
import { usePlatformPreferences } from "@/components/providers/platform-preferences-provider"

type VerifyState = "verifying" | "ready" | "invalid"

export default function ResetPasswordPage() {
  const { t } = usePlatformPreferences()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [verifyState, setVerifyState] = useState<VerifyState>("verifying")
  const [oldPassword, setOldPassword] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [verifyError, setVerifyError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    let isActive = true
    let unsubscribe: (() => void) | undefined

    const verifyRecoverySession = async () => {
      try {
        const queryParams = new URLSearchParams(window.location.search)
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""))

        const getParam = (name: string) => queryParams.get(name) ?? hashParams.get(name)

        const code = getParam("code")
        const tokenHash = getParam("token_hash")
        const type = getParam("type")
        const errorDescription = getParam("error_description")
        const accessToken = getParam("access_token")
        const refreshToken = getParam("refresh_token")
        const expiresIn = getParam("expires_in")
        const expiresAt = getParam("expires_at")

        if (errorDescription) {
          if (isActive) {
            setVerifyError(errorDescription)
            setVerifyState("invalid")
          }
          return
        }

        const attemptRecovery = async () => {
          // PKCE flow: the email link may land with ?code=...
          if (code) {
            const { data, error } = await supabase.auth.exchangeCodeForSession(code)
            if (data.session || data.user) return { ok: true }
            if (error) return { ok: false, error: error.message }
            return { ok: true }
          }

          // Recovery links can also arrive as token_hash + type=recovery
          if (tokenHash && type === "recovery") {
            const { data, error } = await supabase.auth.verifyOtp({
              token_hash: tokenHash,
              type: "recovery",
            })

            if (data.session || data.user) return { ok: true }
            if (error) return { ok: false, error: error.message }
            return { ok: true }
          }

          // Some recovery links include access/refresh tokens directly in the URL.
          if (accessToken && type === "recovery") {
            const sessionPayload: { access_token: string; refresh_token?: string; expires_in?: string; expires_at?: string } = {
              access_token: accessToken,
            }

            if (refreshToken) sessionPayload.refresh_token = refreshToken
            if (expiresIn) sessionPayload.expires_in = expiresIn
            if (expiresAt) sessionPayload.expires_at = expiresAt

            const { data, error } = await supabase.auth.setSession(sessionPayload)
            if (data.session || data.user) return { ok: true }
            if (error) return { ok: false, error: error.message }
            return { ok: true }
          }

          return null
        }

        const { data: sessionData } = await supabase.auth.getSession()
        if (sessionData.session) {
          if (isActive) setVerifyState("ready")
          return
        }

        const { data: subscriptionData } = supabase.auth.onAuthStateChange((event, newSession) => {
          if (!isActive) return
          if (event === "PASSWORD_RECOVERY" || newSession) {
            setVerifyState("ready")
          }
        })

        unsubscribe = () => subscriptionData.subscription.unsubscribe()

        for (let attempt = 0; attempt < 4; attempt += 1) {
          const result = await attemptRecovery()
          if (!isActive) return

          if (result?.ok) {
            const {
              data: { session: refreshedSession },
            } = await supabase.auth.getSession()
            if (refreshedSession) {
              setVerifyState("ready")
              return
            }
          }

          if (result?.error) {
            setVerifyError(result.error)
            break
          }

          await new Promise((resolve) => window.setTimeout(resolve, 1000))
        }

        const {
          data: { session: fallbackSession },
        } = await supabase.auth.getSession()
        if (!isActive) return
        if (fallbackSession) {
          setVerifyState("ready")
          return
        }

        if (isActive) setVerifyState("invalid")
      } catch (error) {
        if (isActive) {
          setVerifyError(error instanceof Error ? error.message : "Unable to verify the reset link")
          setVerifyState("invalid")
        }
      }
    }

    verifyRecoverySession()

    return () => {
      isActive = false
      unsubscribe?.()
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!oldPassword.trim()) {
      setError("Please enter your current password.")
      return
    }
    if (password.length < 8) {
      setError(t("auth.passwordTooShort"))
      return
    }
    if (password !== confirmPassword) {
      setError(t("auth.passwordsDoNotMatch"))
      return
    }

    const supabase = createClient()
    setIsLoading(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user?.email) {
        throw new Error("Your account could not be verified.")
      }

      const { error: oldPasswordError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: oldPassword,
      })

      if (oldPasswordError) {
        throw oldPasswordError
      }

      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error

      setIsSuccess(true)
      // Sign out the temporary recovery session so the user logs in fresh with the new password
      await supabase.auth.signOut()

      setTimeout(() => {
        router.push("/auth/login")
      }, 2500)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (verifyState === "verifying") {
    return (
      <div className="flex min-h-screen w-full items-center justify-center px-4 py-10">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">{t("auth.verifyingResetLink")}</p>
        </div>
      </div>
    )
  }

  if (verifyState === "invalid") {
    return (
      <div className="flex min-h-screen w-full items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md border-destructive/20 shadow-2xl">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <ShieldAlert className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl font-bold">{t("auth.linkExpiredTitle")}</CardTitle>
            <CardDescription className="text-base">
              {t("auth.linkExpiredDesc")}
            </CardDescription>
            {verifyError && (
              <p className="text-sm text-muted-foreground">{verifyError}</p>
            )}
          </CardHeader>
          <CardContent>
            <Button asChild className="h-12 w-full text-base font-semibold">
              <Link href="/auth/forgot-password">{t("auth.requestNewLink")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isSuccess) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md border-primary/20 shadow-2xl">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">{t("auth.passwordUpdatedTitle")}</CardTitle>
            <CardDescription className="text-base">
              {t("auth.passwordUpdatedDesc")}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <KeyRound className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-center text-2xl font-bold tracking-tight">{t("auth.setNewPassword")}</CardTitle>
          <CardDescription className="text-center text-sm sm:text-base">
            {t("auth.setNewPasswordDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="oldPassword" className="text-sm font-semibold">
                Current password
              </Label>
              <Input
                id="oldPassword"
                type="password"
                placeholder="Enter your current password"
                required
                autoFocus
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="h-12 border-border/80 bg-background/70"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold">
                {t("auth.newPassword")}
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 border-border/80 bg-background/70"
              />
              <p className="text-xs text-muted-foreground">{t("auth.atLeast8Chars")}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-semibold">
                {t("auth.confirmNewPassword")}
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-12 border-border/80 bg-background/70"
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="h-12 w-full text-base font-semibold" disabled={isLoading}>
              {isLoading ? t("auth.updatingPassword") : t("auth.updatePassword")}
              {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}