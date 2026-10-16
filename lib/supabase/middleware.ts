import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

const SESSION_STARTED_COOKIE = "sm-session-started-at"
const LAST_ACTIVITY_COOKIE = "sm-last-activity-at"
const DEFAULT_SESSION_MAX_AGE_HOURS = 12
const DEFAULT_INACTIVITY_TIMEOUT_MINUTES = 30

function getMaxSessionAgeMs() {
  const fromEnv = Number(process.env.SESSION_MAX_AGE_HOURS)
  const hours = Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : DEFAULT_SESSION_MAX_AGE_HOURS
  return hours * 60 * 60 * 1000
}

function getInactivityTimeoutMs() {
  const fromEnv = Number(process.env.INACTIVITY_TIMEOUT_MINUTES)
  const minutes = Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : DEFAULT_INACTIVITY_TIMEOUT_MINUTES
  return minutes * 60 * 1000
}

export async function updateSession(request: NextRequest) {
  const maxSessionAgeMs = getMaxSessionAgeMs()
  const inactivityTimeoutMs = getInactivityTimeoutMs()
  const now = Date.now()

  let supabaseResponse = NextResponse.next({
    request,
  })

  // Add cache-control headers to prevent caching of authenticated pages and auth pages
  const protectedRoutes = ["/account", "/seller", "/admin", "/cart", "/checkout", "/auth"]
  const isProtectedRoute = protectedRoutes.some((route) => request.nextUrl.pathname.startsWith(route))

  if (isProtectedRoute) {
    supabaseResponse.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0")
    supabaseResponse.headers.set("Pragma", "no-cache")
    supabaseResponse.headers.set("Expires", "0")
    // Add additional headers to prevent caching by proxies
    supabaseResponse.headers.set("Surrogate-Control", "no-store")
    supabaseResponse.headers.set("ETags", "false")
  }

  // Add security headers to prevent back button caching
  supabaseResponse.headers.set("X-Content-Type-Options", "nosniff")
  supabaseResponse.headers.set("X-Frame-Options", "DENY")

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    },
  )

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const sessionStartedAtRaw = request.cookies.get(SESSION_STARTED_COOKIE)?.value
    const sessionStartedAt = sessionStartedAtRaw ? Number(sessionStartedAtRaw) : NaN
    const hasValidStart = Number.isFinite(sessionStartedAt)
    const lastActivityRaw = request.cookies.get(LAST_ACTIVITY_COOKIE)?.value
    const lastActivityAt = lastActivityRaw ? Number(lastActivityRaw) : NaN
    const hasValidLastActivity = Number.isFinite(lastActivityAt)

    if (user) {
      if (!hasValidStart) {
        supabaseResponse.cookies.set(SESSION_STARTED_COOKIE, String(now), {
          path: "/",
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
        })
      } else if (now - sessionStartedAt > maxSessionAgeMs) {
        await supabase.auth.signOut()
        supabaseResponse.cookies.delete(SESSION_STARTED_COOKIE)
        supabaseResponse.cookies.delete(LAST_ACTIVITY_COOKIE)

        const url = request.nextUrl.clone()
        url.pathname = "/auth/login"
        return NextResponse.redirect(url)
      }

      if (hasValidLastActivity && now - lastActivityAt > inactivityTimeoutMs) {
        await supabase.auth.signOut()
        supabaseResponse.cookies.delete(SESSION_STARTED_COOKIE)
        supabaseResponse.cookies.delete(LAST_ACTIVITY_COOKIE)

        const url = request.nextUrl.clone()
        url.pathname = "/auth/login"
        return NextResponse.redirect(url)
      }

      supabaseResponse.cookies.set(LAST_ACTIVITY_COOKIE, String(now), {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      })
    } else {
      supabaseResponse.cookies.delete(SESSION_STARTED_COOKIE)
      supabaseResponse.cookies.delete(LAST_ACTIVITY_COOKIE)
    }

    // Only redirect to login for protected routes
    // Home page and all shop routes are public
    const protectedRoutes = ["/account", "/seller", "/admin"]
    const isProtectedRoute = protectedRoutes.some((route) => request.nextUrl.pathname.startsWith(route))

    if (!user && isProtectedRoute) {
      const url = request.nextUrl.clone()
      url.pathname = "/auth/login"
      url.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`)
      return NextResponse.redirect(url)
    }
  } catch (error) {
    // If there's an error (including invalid refresh token), clear the cookies and continue
    // This allows users with stale sessions to continue browsing and re-authenticate
    if (error instanceof Error && error.message.includes("refresh_token_not_found")) {
      supabaseResponse.cookies.delete("sb-access-token")
      supabaseResponse.cookies.delete("sb-refresh-token")
    }
    // Don't throw - allow the request to continue
  }

  return supabaseResponse
}
