"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { LoadingScreen } from "@/components/loading-screen"
import { ArrowRight, ShieldCheck, Sparkles, Store, Moon, Sun } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { usePlatformPreferences } from "@/components/providers/platform-preferences-provider"
import { useTheme } from "next-themes"

export default function LoginPage() {
  const { t } = usePlatformPreferences()
  const { resolvedTheme, setTheme } = useTheme()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    setMounted(true)
  }, [])

  const getSafeNextPath = () => {
    const nextPath = searchParams.get("next")
    if (!nextPath) return null
    if (!nextPath.startsWith("/") || nextPath.startsWith("//")) return null
    if (nextPath.startsWith("/auth")) return null
    return nextPath
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error

      await new Promise((resolve) => setTimeout(resolve, 100))

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

        setIsRedirecting(true)

        const nextPath = getSafeNextPath()

        router.refresh()

        // Add slight delay for smooth transition
        await new Promise((resolve) => setTimeout(resolve, 800))

        if (nextPath) {
          router.push(nextPath)
        } else if (profile?.role === "admin") {
          router.push("/admin")
        } else if (profile?.role === "seller") {
          router.push("/seller")
        } else {
          router.push("/")
        }
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
      setIsLoading(false)
    }
  }

  if (isRedirecting) {
    return <LoadingScreen />
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(15,118,110,0.12),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.12),_transparent_30%),hsl(var(--background))] px-4 py-10 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute -left-24 top-10 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-10 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />

      <div className="pointer-events-none fixed right-4 top-4 z-50 sm:right-6 lg:right-8">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          className="pointer-events-auto h-10 w-10 rounded-full border-border/70 bg-background/80 shadow-sm backdrop-blur"
          aria-label="Toggle theme"
        >
          {mounted && resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>

      <div className="relative mx-auto grid w-full max-w-5xl overflow-hidden rounded-[30px] border border-border/60 bg-card/80 shadow-[0_30px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl md:grid-cols-[1.05fr_0.95fr]">
        <div className="relative hidden flex-col justify-between border-r border-border/70 bg-gradient-to-br from-primary/5 via-background to-background p-8 md:flex">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">Shega Mart</p>
              <p className="text-xs text-muted-foreground">Shop with ease</p>
            </div>
          </div>

          <div className="space-y-5">
            <div className="overflow-hidden rounded-[24px] border border-border/70 bg-background/80 p-2 shadow-sm">
              <div className="relative flex h-[240px] items-center justify-center overflow-hidden rounded-[18px] bg-gradient-to-br from-amber-100 via-emerald-100 to-teal-100 p-4 dark:from-emerald-950 dark:via-emerald-900 dark:to-slate-900">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.18),_transparent_25%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.18),_transparent_30%)]" />
                <img
                  src="/shega-mart-logo.png"
                  alt="Shega Mart logo"
                  className="relative h-full w-full rounded-[14px] object-contain p-2"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-primary">{t("auth.welcomeBackTag")}</p>
              <h1 className="text-3xl font-semibold leading-tight tracking-tight text-foreground">
                Shop the heartbeat of Ethiopia
              </h1>
              <p className="max-w-sm text-sm leading-6 text-muted-foreground">
                Discover trusted local brands, essentials, and modern finds designed for Ethiopian shoppers.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/80 p-3 shadow-sm">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <p className="text-sm text-muted-foreground">{t("auth.secureAuthNotice")}</p>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/80 p-3 shadow-sm">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                <Sparkles className="h-4 w-4" />
              </div>
              <p className="text-sm text-muted-foreground">{t("auth.liveNotificationsNotice")}</p>
            </div>
          </div>
        </div>

        <Card className="rounded-none border-0 bg-transparent shadow-none">
          <CardHeader className="space-y-5 px-6 pb-4 pt-8 sm:px-8 lg:px-10">
            <div className="flex items-center gap-3 md:hidden">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold tracking-[0.18em] text-primary">SHEGA MART</p>
                <p className="text-[11px] text-muted-foreground">SHOP WITH JOY</p>
              </div>
            </div>

            <div className="space-y-2">
              <span className="inline-flex rounded-full border border-primary/15 bg-primary/5 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
                {t("auth.signIn")}
              </span>
              <CardTitle className="text-3xl font-semibold tracking-tight text-foreground">{t("auth.signIn")}</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">{t("auth.signInDesc")}</CardDescription>
            </div>
          </CardHeader>

          <CardContent className="px-6 pb-8 sm:px-8 lg:px-10">
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-4 rounded-[24px] border border-border/70 bg-background/70 p-4 shadow-sm">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-foreground">
                    {t("auth.emailAddress")}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 border-border/80 bg-background/80 text-sm shadow-none placeholder:text-muted-foreground/70 focus-visible:ring-primary/30"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-medium text-foreground">
                      {t("auth.password")}
                    </Label>
                    <Link
                      href="/auth/forgot-password"
                      className="text-xs font-medium text-primary transition-colors hover:text-primary/80"
                    >
                      {t("auth.forgotPassword")}
                    </Link>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 border-border/80 bg-background/80 text-sm shadow-none placeholder:text-muted-foreground/70 focus-visible:ring-primary/30"
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="h-12 w-full rounded-2xl text-base font-semibold shadow-[0_18px_40px_rgba(15,118,110,0.18)] transition-all hover:translate-y-[-1px]"
                disabled={isLoading}
              >
                <span>{isLoading ? t("auth.signingIn") : t("auth.signIn")}</span>
                {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              <span>{t("auth.noAccount")} </span>
              <Link href="/auth/signup" className="font-semibold text-primary transition-colors hover:text-primary/80">
                {t("auth.createAccount")}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}