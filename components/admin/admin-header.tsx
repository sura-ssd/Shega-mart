"use client"

import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { Moon, Sun, User, LogOut, Loader2 } from "lucide-react"
import { useTheme } from "next-themes"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Profile } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { usePlatformPreferences } from "@/components/providers/platform-preferences-provider"

export function AdminHeader() {
  const { t } = usePlatformPreferences()
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [user, setUser] = useState<{ email: string; profile: Profile | null } | null>(null)
  const [mounted, setMounted] = useState(false)
  const [newMessagesCount, setNewMessagesCount] = useState(0)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const handleSignOut = async () => {
    if (isSigningOut) return

    setIsSigningOut(true)

    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error("[v0] Admin sign out failed:", error)
    } finally {
      window.location.replace("/auth/login")
    }
  }

  const handleToggleTheme = () => {
    const activeTheme = resolvedTheme || theme
    setTheme(activeTheme === "dark" ? "light" : "dark")
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()
      if (authUser) {
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", authUser.id).single()
        setUser({ email: authUser.email!, profile })
      } else {
        setUser(null)
      }
    }
    getUser()
  }, [supabase])

  useEffect(() => {
    if (user?.profile?.role !== "admin") {
      setNewMessagesCount(0)
      return
    }

    const fetchNewMessagesCount = async () => {
      const { count, error } = await supabase
        .from("contact_messages")
        .select("id", { count: "exact", head: true })
        .eq("status", "new")

      if (error) {
        return
      }

      setNewMessagesCount(count || 0)
    }

    void fetchNewMessagesCount()

    const channel = supabase
      .channel("admin-contact-messages-badge")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "contact_messages",
        },
        () => {
          void fetchNewMessagesCount()
        },
      )
      .subscribe()

    const handleMessagesUpdated = () => {
      void fetchNewMessagesCount()
    }

    window.addEventListener("admin-contact-messages-updated", handleMessagesUpdated)

    return () => {
      window.removeEventListener("admin-contact-messages-updated", handleMessagesUpdated)
      void supabase.removeChannel(channel)
    }
  }, [supabase, user?.profile?.role])

  if (!mounted) {
    return (
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 shadow-sm">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg transition-transform group-hover:scale-105 overflow-hidden flex-shrink-0">
              <img src="/shega-mart-logo.png" alt="Shega Mart" className="h-9 w-9 object-contain" />
            </div>
            <span className="text-xl font-bold tracking-tight text-primary">Shega Mart Admin</span>
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/admin" className="flex items-center space-x-3 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg transition-transform group-hover:scale-105 overflow-hidden flex-shrink-0">
            <img src="/shega-mart-logo.png" alt="Shega Mart" className="h-9 w-9 object-contain" />
          </div>
          <span className="text-xl font-bold tracking-tight text-primary">Shega Mart Admin</span>
        </Link>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-primary/10 transition-colors"
            onClick={handleToggleTheme}
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">{t("admin.toggleTheme")}</span>
          </Button>

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative hover:bg-primary/10 transition-colors">
                  <User className="h-5 w-5" />
                  {newMessagesCount > 0 ? (
                    <Badge className="absolute -right-1 -top-1 h-5 min-w-5 rounded-full px-1 text-[10px] leading-none bg-destructive text-destructive-foreground hover:bg-destructive">
                      {newMessagesCount > 99 ? "99+" : newMessagesCount}
                    </Badge>
                  ) : null}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 p-2">
                <div className="px-3 py-3 rounded-lg bg-muted/50">
                  <p className="font-semibold text-base">{user.profile?.full_name || t("admin.adminFallback")}</p>
                  <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
                  <Badge className="mt-2 capitalize bg-primary/10 text-primary hover:bg-primary/20">
                    {user.profile?.role}
                  </Badge>
                </div>
                <DropdownMenuSeparator className="my-2" />
                <DropdownMenuItem asChild className="cursor-pointer py-2">
                  <Link href="/account">{t("header.myAccount")}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer py-2">
                  <Link href="/admin/messages">{t("header.contactMessages")}</Link>
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
          )}
        </div>
      </div>
    </header>
  )
}
