'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Hook to prevent users from navigating back to authenticated pages after logout
 * This prevents the back button from showing cached authenticated pages
 */
export function usePreventBackNavigation() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        // User is not authenticated
        // Add a history entry to prevent back navigation to auth pages
        window.history.pushState(null, '', window.location.pathname)
      }
    }

    checkAuth()
  }, [supabase])

  // Listen for popstate event (back button) on protected routes
  useEffect(() => {
    const handlePopState = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      // If user tries to go back to a protected page but is logged out, redirect to login
      if (!user && window.location.pathname.match(/^\/(account|admin|seller|checkout)/)) {
        window.location.href = '/auth/login'
      }

      // If user is logged in on a login page, redirect to home
      if (user && window.location.pathname.startsWith('/auth')) {
        window.location.href = '/'
      }
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [supabase])
}
