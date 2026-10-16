"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { Moon, ShoppingCart, Sun, User, LogOut, Loader2, Languages, Menu, X as CloseIcon } from "lucide-react"
import { useTheme } from "next-themes"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Profile } from "@/lib/types"
import { useCart } from "@/hooks/use-cart"
import { Badge } from "@/components/ui/badge"
import { NotificationBell } from "@/components/notifications/notification-bell"
import { usePlatformPreferences } from "@/components/providers/platform-preferences-provider"

export function SiteHeader() {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [user, setUser] = useState<{ email: string; profile: Profile | null } | null>(null)
  const [mounted, setMounted] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])
  const items = useCart((state) => state.items)
  const totalItems = items.reduce((total, item) => total + item.quantity, 0)
  const { loadUserCart, clearCart } = useCart()
  const {
    language,
    currency,
    setLanguage,
    setCurrency,
    t,
    languageOptions,
    currencyOptions,
  } = usePlatformPreferences()

  const handleSignOut = async () => {
    if (isSigningOut) return

    setIsSigningOut(true)

    try {
      clearCart()
      await supabase.auth.signOut()
    } catch (error) {
      console.error("[v0] Sign out failed:", error)
    } finally {
      window.location.replace("/auth/login")
    }
  }

  const handleToggleTheme = () => {
    const activeTheme = resolvedTheme || theme
    setTheme(activeTheme === "dark" ? "light" : "dark")
  }

  const loginHref = `/auth/login?next=${encodeURIComponent(`${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`)}`

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const loadUserProfile = async (userId: string, email: string) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("id", userId)
        .single()
      setUser({ email, profile: (profile as Profile | null) || null })
    }

    const getUser = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()
      if (authUser) {
        await loadUserProfile(authUser.id, authUser.email || "")
        await loadUserCart(authUser.id)
      } else {
        setUser(null)
      }
    }

    getUser()

    // Listen for auth state changes
    let authWorkTimer: number | undefined
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      window.clearTimeout(authWorkTimer)
      authWorkTimer = window.setTimeout(() => {
        if (session?.user) {
          void loadUserProfile(session.user.id, session.user.email || "")
          void loadUserCart(session.user.id)
        } else {
          setUser(null)
          clearCart()
        }
      }, 0)
    })

    return () => {
      window.clearTimeout(authWorkTimer)
      subscription.unsubscribe()
    }
  }, [supabase, loadUserCart, clearCart])

  const isSeller = user?.profile?.role === "seller"

  return (
    <header className="sticky top-0 z-50 w-full bg-transparent">
      <div className="container py-2">
        <div className="h-14 rounded-2xl border border-border/70 bg-card/65 px-3 shadow-lg shadow-primary/5 backdrop-blur-xl">
          <div className="flex h-full items-center justify-between gap-3">
            <Link href="/" className="group flex items-center gap-2.5 flex-shrink-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-background/85 transition-transform group-hover:scale-105 overflow-hidden flex-shrink-0">
                <Image src="/shega-mart-logo.png" alt="Shega Mart" width={40} height={40} className="object-contain" priority />
              </div>
              <div className="flex flex-col gap-0">
                <span className="text-sm font-bold tracking-tight text-primary leading-tight">
                  SHEGA MART
                </span>
                <span className="text-xs font-semibold text-accent tracking-wider leading-tight">
                  SHOP WITH JOY
                </span>
              </div>
            </Link>

            <div className="flex items-center gap-1.5 md:hidden">
              <details className="group relative">
                <summary
                  aria-label="Toggle navigation menu"
                  className="relative flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full border border-border/60 bg-background/60 p-0 transition-all duration-200 hover:scale-105 hover:border-primary/30 hover:bg-primary/10 active:scale-95 [&::-webkit-details-marker]:hidden"
                >
                  <Menu className="absolute h-5 w-5 transition-all duration-300 ease-out group-open:rotate-90 group-open:scale-75 group-open:opacity-0" />
                  <CloseIcon className="absolute h-5 w-5 -rotate-90 scale-75 opacity-0 transition-all duration-300 ease-out group-open:rotate-0 group-open:scale-100 group-open:opacity-100" />
                  {user && !isSeller && totalItems > 0 && (
                    <Badge className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full p-0 text-[10px]">
                      {totalItems}
                    </Badge>
                  )}
                  <span className="sr-only">Open menu</span>
                </summary>
                <div className="absolute right-0 top-12 z-[60] max-h-[min(75vh,36rem)] w-64 origin-top-right animate-in fade-in-0 slide-in-from-top-2 overflow-y-auto rounded-xl border border-border/70 bg-popover p-2 text-popover-foreground shadow-xl duration-200">
                  <button type="button" className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-accent" onClick={handleToggleTheme}>
                    {mounted && resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    {mounted && resolvedTheme === "dark" ? t("header.lightMode") : t("header.darkMode")}
                  </button>
                  <div className="my-2 h-px bg-border" />
                  <p className="px-2 py-1 text-xs font-semibold text-muted-foreground">{t("header.language")}</p>
                  {languageOptions.map((option) => (
                    <button key={`mobile-lang-${option.code}`} type="button" className="flex w-full items-center rounded-md px-2 py-2 text-left text-sm hover:bg-accent" onClick={() => { setLanguage(option.code); router.refresh() }}>
                      {option.label}{language === option.code ? " ✓" : ""}
                    </button>
                  ))}
                  <div className="my-2 h-px bg-border" />
                  <p className="px-2 py-1 text-xs font-semibold text-muted-foreground">{t("header.currency")}</p>
                  {currencyOptions.map((option) => (
                    <button key={`mobile-currency-${option.code}`} type="button" className="flex w-full items-center rounded-md px-2 py-2 text-left text-sm hover:bg-accent" onClick={() => { setCurrency(option.code); router.refresh() }}>
                      {option.label}{currency === option.code ? " ✓" : ""}
                    </button>
                  ))}
                  <div className="my-2 h-px bg-border" />
                  <Link href="/contact" className="block rounded-md px-2 py-2 text-sm hover:bg-accent">{t("header.contactUs")}</Link>
                  {user ? (
                    <>
                      <Link href="/account/notifications" className="block rounded-md px-2 py-2 text-sm hover:bg-accent">{t("header.notifications")}</Link>
                      {!isSeller && <Link href="/cart" className="block rounded-md px-2 py-2 text-sm hover:bg-accent">{t("header.cart")}</Link>}
                      <Link href="/account" className="block rounded-md px-2 py-2 text-sm hover:bg-accent">{t("header.myAccount")}</Link>
                      {!isSeller && <Link href="/account/orders" className="block rounded-md px-2 py-2 text-sm hover:bg-accent">{t("header.orderHistory")}</Link>}
                      {user.profile?.role === "seller" && <Link href="/seller" className="block rounded-md px-2 py-2 text-sm hover:bg-accent">{t("header.sellerDashboard")}</Link>}
                      {user.profile?.role === "seller" && <Link href="/seller/orders" className="block rounded-md px-2 py-2 text-sm hover:bg-accent">{t("header.myOrders")}</Link>}
                      {user.profile?.role === "admin" && <Link href="/admin" className="block rounded-md px-2 py-2 text-sm hover:bg-accent">{t("header.adminDashboard")}</Link>}
                      {user.profile?.role === "admin" && <Link href="/admin/messages" className="block rounded-md px-2 py-2 text-sm hover:bg-accent">{t("header.contactMessages")}</Link>}
                      <div className="my-2 h-px bg-border" />
                      <button type="button" onClick={handleSignOut} disabled={isSigningOut} className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50">
                        {isSigningOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                        {isSigningOut ? "Signing out..." : t("header.signOut")}
                      </button>
                    </>
                  ) : <Link href={loginHref} className="block rounded-md px-2 py-2 text-sm hover:bg-accent">{t("header.signIn")}</Link>}
                </div>
              </details>
            </div>

            <div className="hidden md:flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 rounded-full border border-transparent p-0 hover:border-primary/20 hover:bg-primary/10 transition-colors"
            onClick={handleToggleTheme}
          >
            {mounted && resolvedTheme === "dark" ? (
              <Sun className="h-4 w-4 theme-toggle-icon" />
            ) : (
              <Moon className="h-4 w-4 theme-toggle-icon" />
            )}
            <span className="sr-only">Toggle theme</span>
          </Button>

          {user && <NotificationBell userId={user.profile?.id || null} />}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 rounded-full border border-transparent px-3 text-xs hover:border-primary/20 hover:bg-primary/10 transition-colors"
              >
                <Languages className="mr-1 h-3.5 w-3.5" />
                {language.toUpperCase()} / {currency}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-2">
              <p className="px-2 py-1 text-xs font-semibold text-muted-foreground">{t("header.language")}</p>
              {languageOptions.map((option) => (
                <DropdownMenuItem
                  key={option.code}
                  className="cursor-pointer"
                  onClick={() => {
                    setLanguage(option.code)
                    router.refresh()
                  }}
                >
                  {option.label}
                  {language === option.code ? " ✓" : ""}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator className="my-2" />
              <p className="px-2 py-1 text-xs font-semibold text-muted-foreground">{t("header.currency")}</p>
              {currencyOptions.map((option) => (
                <DropdownMenuItem
                  key={option.code}
                  className="cursor-pointer"
                  onClick={() => {
                    setCurrency(option.code)
                    router.refresh()
                  }}
                >
                  {option.label}
                  {currency === option.code ? " ✓" : ""}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {user && !isSeller && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 rounded-full border border-transparent p-0 relative hover:border-primary/20 hover:bg-primary/10 transition-colors"
              asChild
            >
              <Link href="/cart">
                <ShoppingCart className="h-4 w-4" />
                {totalItems > 0 && (
                  <Badge className="absolute -right-2 -top-2 h-4 w-4 rounded-full p-0 text-xs flex items-center justify-center bg-gradient-to-br from-primary to-primary/60 shadow-lg shadow-primary/25 animate-scale-in">
                    {totalItems}
                  </Badge>
                )}
              </Link>
            </Button>
          )}

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 rounded-full border border-transparent p-0 hover:border-primary/20 hover:bg-primary/10 transition-colors"
                >
                  <User className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 p-2">
                <div className="px-3 py-3 rounded-lg bg-muted/50">
                  <p className="font-semibold text-base">{user.profile?.full_name || t("header.user")}</p>
                  <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
                  <Badge className="mt-2 capitalize bg-primary/10 text-primary hover:bg-primary/20">
                    {user.profile?.role}
                  </Badge>
                </div>
                <DropdownMenuSeparator className="my-2" />
                {!isSeller && (
                  <>
                    <DropdownMenuItem asChild className="cursor-pointer py-2">
                      <Link href="/account">{t("header.myAccount")}</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="cursor-pointer py-2">
                      <Link href="/account/orders">{t("header.orderHistory")}</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="my-2" />
                  </>
                )}
                {isSeller && (
                  <>
                    <DropdownMenuItem asChild className="cursor-pointer py-2">
                      <Link href="/account">{t("header.myAccount")}</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="my-2" />
                  </>
                )}
                {user.profile?.role === "seller" && (
                  <>
                    <DropdownMenuItem asChild className="cursor-pointer py-2">
                      <Link href="/seller">{t("header.sellerDashboard")}</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="cursor-pointer py-2">
                      <Link href="/seller/orders">{t("header.myOrders")}</Link>
                    </DropdownMenuItem>
                  </>
                )}
                {user.profile?.role === "admin" && (
                  <>
                    <DropdownMenuItem asChild className="cursor-pointer py-2">
                      <Link href="/admin">{t("header.adminDashboard")}</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="cursor-pointer py-2">
                      <Link href="/admin/messages">{t("header.contactMessages")}</Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuItem asChild className="cursor-pointer py-2">
                  <Link href="/contact">{t("header.contactUs")}</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-2" />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="cursor-pointer py-2 text-destructive focus:text-destructive"
                  disabled={isSigningOut}
                >
                  {isSigningOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
                  {isSigningOut ? "Signing out..." : t("header.signOut")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              asChild
              variant="default"
              size="sm"
              className="h-9 rounded-full px-4 text-xs shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
            >
              <Link href={loginHref}>{t("header.signIn")}</Link>
            </Button>
          )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
