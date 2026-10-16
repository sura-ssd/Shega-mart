'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'

/**
 * Client component that handles authentication state protection
 * Prevents back button from showing cached logged-in pages after logout
 */
export function AuthProtectionClient() {
  const supabase = createClient()
  const router = useRouter()
  const pathname = usePathname()
  const lastPathRef = useRef<string>(pathname)

  useEffect(() => {
    lastPathRef.current = pathname
  }, [pathname])

  useEffect(() => {
    const handleSignedOut = async () => {
      if ('caches' in window) {
        try {
          const cacheNames = await caches.keys()
          for (const cacheName of cacheNames) {
            const cache = await caches.open(cacheName)
            const protectedRoutes = ['/account', '/admin', '/seller', '/checkout', '/cart']
            for (const route of protectedRoutes) {
              const keys = await cache.keys()
              for (const req of keys) {
                if (req.url.includes(route)) {
                  await cache.delete(req)
                }
              }
            }
          }
        } catch {
          // Cache clearing failed silently.
        }
      }

      window.history.replaceState(null, '', '/auth/login')
    }

    // Keep auth callbacks synchronous; async work inside them can hold the auth lock.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        window.setTimeout(() => void handleSignedOut(), 0)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, router])

  // Handle popstate (back/forward button)
  useEffect(() => {
    const handlePopState = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const protectedRoutes = ['/account', '/admin', '/seller', '/checkout', '/cart']
      const isProtectedRoute = protectedRoutes.some((route) =>
        window.location.pathname.startsWith(route)
      )

      // If trying to go back to protected route but not logged in, go to login
      if (!user && isProtectedRoute) {
        window.location.href = '/auth/login'
      }

      // If logged in and going back to auth pages, go to home
      if (user && window.location.pathname.startsWith('/auth')) {
        window.location.href = '/'
      }
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [supabase])

  return null
}
