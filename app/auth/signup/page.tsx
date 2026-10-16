"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { ArrowRight, BadgeCheck, Moon, Store, Sun, UserRound, Users } from "lucide-react"
import { useTheme } from "next-themes"
import { usePlatformPreferences } from "@/components/providers/platform-preferences-provider"

export default function SignUpPage() {
  const { t } = usePlatformPreferences()
  const { resolvedTheme, setTheme } = useTheme()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [houseNumber, setHouseNumber] = useState("")
  const [street, setStreet] = useState("")
  const [city, setCity] = useState("")
  const [region, setRegion] = useState("")
  const [postalCode, setPostalCode] = useState("")
  const [role, setRole] = useState<"customer" | "seller" | "">("")
  const [step, setStep] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  const getPasswordStrength = (value: string) => {
    const checks = [
      value.length >= 8,
      /[A-Z]/.test(value),
      /[a-z]/.test(value),
      /[0-9]/.test(value),
      /[^A-Za-z0-9]/.test(value),
    ]

    const score = checks.reduce((total, passed) => total + (passed ? 1 : 0), 0)
    const label = score >= 5 ? "Strong" : score >= 4 ? "Good" : score >= 3 ? "Fair" : "Weak"
    const color = score >= 5 ? "bg-emerald-500" : score >= 4 ? "bg-primary" : score >= 3 ? "bg-amber-500" : "bg-destructive"

    return { score, label, color }
  }

  const passwordStrength = getPasswordStrength(password)

  const validateStep = () => {
    if (step === 1) {
      if (!fullName.trim() || !email.trim() || !password || !confirmPassword.trim() || !phone.trim()) {
        setError("Please complete all account details before continuing.")
        return false
      }

      if (password !== confirmPassword) {
        setError("Passwords do not match.")
        return false
      }
    }

    if (step === 2) {
      if (!houseNumber.trim() || !city.trim() || !region.trim()) {
        setError("Please complete the required address fields before continuing.")
        return false
      }
    }

    if (step === 3 && !role) {
      setError("Please select an account type before continuing.")
      return false
    }

    setError(null)
    return true
  }

  const handleNext = () => {
    if (validateStep()) {
      setStep((current) => Math.min(current + 1, 3))
    }
  }

  const handleBack = () => {
    setError(null)
    setStep((current) => Math.max(current - 1, 1))
  }

  const getStepClass = (currentStep: number) =>
    step === currentStep
      ? "relative opacity-100 translate-x-0 transition-all duration-500 ease-in-out"
      : "absolute inset-0 opacity-0 -translate-x-4 pointer-events-none transition-all duration-500 ease-in-out"

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()

    if (step < 3) {
      if (!validateStep()) return
      setStep(3)
      return
    }

    if (!validateStep()) return
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const trimmedFullName = fullName.trim()
      const trimmedPhone = phone.trim()
      const trimmedAddress = [houseNumber, street, city, region, postalCode]
        .map((part) => part.trim())
        .filter(Boolean)
        .join(", ")

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo:
            process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/auth/welcome`,
          data: {
            full_name: trimmedFullName,
            role,
            phone: trimmedPhone,
            address: trimmedAddress,
          },
        },
      })

      if (error) throw error

      if (data.user) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            full_name: trimmedFullName,
            phone: trimmedPhone,
            address: trimmedAddress,
          })
          .eq("id", data.user.id)

        if (profileError) {
          console.error("[v0] Profile update error:", profileError)
        }
      }

      router.push("/auth/signup-success")
    } catch (error: unknown) {
      console.error("[v0] Signup error:", error)
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background text-foreground px-4 py-10 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute right-8 bottom-10 h-72 w-72 rounded-full bg-secondary/15 blur-3xl" />

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

      <div className="relative mx-auto grid w-full max-w-7xl gap-6 overflow-hidden rounded-[2rem] border border-border/70 bg-card/95 shadow-2xl shadow-slate-200/20 dark:bg-card/90 dark:shadow-slate-950/20 lg:grid-cols-[1.35fr_0.95fr]">
        <Card className="self-start rounded-none border-0 bg-transparent shadow-none order-2 lg:order-1">
          <CardHeader className="space-y-4 px-6 pt-8 sm:px-10">
            <div className="flex items-center gap-4 rounded-[1.75rem] border border-border/70 bg-primary/5 p-4 shadow-sm shadow-slate-100 dark:border-border/60 dark:bg-primary/10 dark:shadow-none">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <Store className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold tracking-wide text-primary">Create account</p>
                <p className="text-xs text-slate-600 dark:text-slate-300">Join the marketplace in minutes with one smooth flow.</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-8 sm:px-10">
            <div className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-sm shadow-slate-100/20 dark:bg-card/95 dark:shadow-none">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-lg font-semibold">Step {step} of 3</p>
                  <p className="mt-1 text-sm text-muted-foreground">Complete this step to continue.</p>
                </div>
                <div className="inline-flex items-center gap-3 rounded-full bg-card/80 px-4 py-2 text-xs font-semibold text-foreground shadow-sm dark:bg-card/90 dark:text-foreground">
                  <span className={step === 1 ? "text-primary" : "text-slate-400"}>1</span>
                  <span className={step === 2 ? "text-primary" : "text-slate-400"}>2</span>
                  <span className={step === 3 ? "text-primary" : "text-slate-400"}>3</span>
                </div>
              </div>

              <form
                onSubmit={handleSignUp}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && step < 3) {
                    e.preventDefault()
                    handleNext()
                  }
                }}
                className="relative min-h-[360px]"
              >
                <div className={getStepClass(1)}>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="fullName" className="text-sm font-semibold">{t("auth.fullName")}</Label>
                        <Input
                          id="fullName"
                          type="text"
                          placeholder="John Doe"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="h-12 border-border/80 bg-background/95 shadow-sm dark:bg-background/10 dark:shadow-none dark:border-border/60"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password" className="text-sm font-semibold">{t("auth.password")}</Label>
                        <Input
                          id="password"
                          type="password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="h-12 border-border/80 bg-background/95 shadow-sm dark:bg-background/10 dark:shadow-none dark:border-border/60"
                        />
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Password strength</span>
                            <span className={`font-semibold ${passwordStrength.score >= 4 ? "text-foreground" : "text-destructive"}`}>{passwordStrength.label}</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                            <div
                              className={`h-full rounded-full ${passwordStrength.color}`}
                              style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">Use at least 8 characters plus uppercase, lowercase, numbers, and symbols.</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword" className="text-sm font-semibold">Confirm password</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          placeholder="••••••••"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="h-12 border-border/80 bg-background/95 shadow-sm dark:bg-background/10 dark:shadow-none dark:border-border/60"
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-semibold">{t("auth.emailAddress")}</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="h-12 border-border/80 bg-background/95 text-foreground shadow-sm dark:bg-background/10 dark:text-foreground dark:shadow-none dark:border-border/60"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-sm font-semibold">{t("common.phone")}</Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="+251 9XX XXX XXX"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="h-12 border-border/80 bg-background/95 text-foreground shadow-sm dark:bg-background/10 dark:text-foreground dark:shadow-none dark:border-border/60"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className={getStepClass(2)}>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="houseNumber" className="text-sm font-semibold">House / apartment number</Label>
                        <Input
                          id="houseNumber"
                          type="text"
                          placeholder="House 12 / Apt 3"
                          value={houseNumber}
                          onChange={(e) => setHouseNumber(e.target.value)}
                          className="h-12 border-border/80 bg-background/95 text-foreground shadow-sm dark:bg-background/10 dark:text-foreground dark:shadow-none dark:border-border/60"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="city" className="text-sm font-semibold">City</Label>
                        <Input
                          id="city"
                          type="text"
                          placeholder="Addis Ababa"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className="h-12 border-border/80 bg-background/95 text-foreground shadow-sm dark:bg-background/10 dark:text-foreground dark:shadow-none dark:border-border/60"
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="street" className="text-sm font-semibold">Street</Label>
                          <span className="text-xs text-muted-foreground">Optional</span>
                        </div>
                        <Input
                          id="street"
                          type="text"
                          placeholder="Main street"
                          value={street}
                          onChange={(e) => setStreet(e.target.value)}
                          className="h-12 border-border/80 bg-background/95 text-foreground shadow-sm dark:bg-background/10 dark:text-foreground dark:shadow-none dark:border-border/60"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="region" className="text-sm font-semibold">Region</Label>
                        <Input
                          id="region"
                          type="text"
                          placeholder="Bole"
                          value={region}
                          onChange={(e) => setRegion(e.target.value)}
                          className="h-12 border-border/80 bg-background/95 text-foreground shadow-sm dark:bg-background/10 dark:text-foreground dark:shadow-none dark:border-border/60"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2 lg:col-span-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="postalCode" className="text-sm font-semibold">Postal code</Label>
                      <span className="text-xs text-muted-foreground">Optional</span>
                    </div>
                    <Input
                      id="postalCode"
                      type="text"
                      placeholder="1000"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      className="h-12 border-border/80 bg-background/95 text-foreground shadow-sm dark:bg-background/10 dark:text-foreground dark:shadow-none dark:border-border/60"
                    />
                  </div>
                </div>

                <div className={getStepClass(3)}>
                  <div className="grid gap-4 lg:grid-cols-[1.2fr_auto]">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="role" className="text-sm font-semibold">{t("auth.accountType")}</Label>
                        <Select value={role} onValueChange={(value: "customer" | "seller") => setRole(value)}>
                          <SelectTrigger id="role" className="h-12 border-border/80 bg-background/95 shadow-sm dark:bg-background/10 dark:shadow-none dark:border-border/60">
                            <SelectValue placeholder={t("auth.selectAccountType")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="customer">{t("auth.roleCustomer")}</SelectItem>
                            <SelectItem value="seller">{t("auth.roleSeller")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="rounded-2xl border border-border/70 bg-card/80 p-4 text-sm text-muted-foreground dark:bg-card/95">
                        <p className="font-semibold text-foreground">Why choose an account type?</p>
                        <p className="mt-2 text-muted-foreground">Customer accounts let you browse and buy. Seller accounts let you list products and manage orders.</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-center rounded-3xl bg-slate-100 p-5 shadow-sm dark:bg-slate-800">
                      <div className="text-center text-sm text-slate-600 dark:text-slate-200">
                        <p className="font-semibold">Ready to finish?</p>
                        <p className="mt-2">Review your account type and submit.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive font-medium">
                    {error}
                  </div>
                )}

                <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 w-full lg:w-auto"
                    onClick={handleBack}
                    disabled={step === 1}
                  >
                    Back
                  </Button>
                  {step < 3 ? (
                    <Button
                      type="button"
                      className="h-12 w-full lg:w-auto"
                      onClick={handleNext}
                    >
                      Next
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      className="h-12 w-full lg:w-auto text-base font-semibold shadow-lg shadow-primary/20"
                      disabled={isLoading}
                    >
                      {isLoading ? t("auth.signingUp") : t("auth.signUp")}
                      {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
                    </Button>
                  )}
                </div>
              </form>
            </div>
            <div className="mt-6 text-center text-sm text-slate-600">
              <span>{t("auth.haveAccount")} </span>
              <Link href="/auth/login" className="font-semibold text-primary hover:text-primary/80 transition-colors">
                {t("auth.signInLink")}
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="relative order-1 flex h-full flex-col justify-between rounded-[1.75rem] bg-gradient-to-br from-secondary/20 via-secondary/15 to-primary/20 p-6 text-slate-900 shadow-xl dark:from-secondary/90 dark:via-secondary/75 dark:to-primary/80 dark:text-white md:order-2 md:p-8">
          <div className="rounded-[1.75rem] border border-white/10 bg-white/90 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.12)] backdrop-blur-sm dark:bg-white/5 dark:text-white">
            <div className="mb-5 rounded-[1.5rem] bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 p-6 text-slate-900 shadow-lg shadow-slate-200/70 dark:from-slate-900 dark:via-cyan-900 dark:to-fuchsia-900 dark:text-white dark:shadow-slate-950/50">
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-lg">
                <Users className="h-7 w-7" />
              </div>
              <p className="text-xl font-semibold">Fast account setup</p>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-200">Easily get set up with a clear, guided signup experience designed for both buyers and sellers.</p>
            </div>
            <div className="grid gap-4">
              <div className="rounded-3xl bg-white p-4 text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100 dark:shadow-none">
                <p className="font-semibold">Secure profile</p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Your details are stored securely and connected to your profile.</p>
              </div>
              <div className="rounded-3xl bg-white p-4 text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100 dark:shadow-none">
                <p className="font-semibold">One experience</p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Buyers and sellers use the same account model with role-based access.</p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            <div className="rounded-3xl bg-white/90 p-4 text-sm text-slate-900 shadow-sm backdrop-blur dark:bg-slate-800/60 dark:text-slate-100 dark:shadow-none">
              <p className="font-semibold">Step-by-step onboarding</p>
              <p className="mt-2 text-slate-600 dark:text-slate-300">Fill in just a few fields each step instead of one long form.</p>
            </div>
            <div className="rounded-3xl bg-white/90 p-4 text-sm text-slate-900 shadow-sm backdrop-blur dark:bg-slate-800/60 dark:text-slate-100 dark:shadow-none">
              <p className="font-semibold">Designed for speed</p>
              <p className="mt-2 text-slate-600 dark:text-slate-300">The page stays wide and balanced on desktop for a better experience.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
