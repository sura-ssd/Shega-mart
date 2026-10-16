import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { createClient } from '@supabase/supabase-js'

export type UserRole = 'admin' | 'seller' | 'customer'

interface AuthUser {
  id: string
  email: string
  role: UserRole
}

/**
 * Get user from request and verify authentication
 * Uses Supabase SSR client which reads from cookies (set by middleware)
 */
export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies()
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      logger.error('Missing Supabase environment variables')
      return null
    }

    // Create SSR client from cookies (includes auth session)
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          // Cookies are read-only in API routes
        },
      },
    })

    // Get authenticated user from session
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return null
    }

    // Get user role from profiles table using service role key for admin access
    const adminSubabase = createServerClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() {},
      },
    })

    const { data: profile } = await adminSubabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return null
    }

    return {
      id: user.id,
      email: user.email || '',
      role: (profile.role as UserRole) || 'customer',
    }
  } catch (error) {
    logger.error('Error getting auth user', { error })
    return null
  }
}

/**
 * Require a specific role for API endpoint
 */
export function requireRole(role: UserRole | UserRole[]) {
  return async (request: NextRequest) => {
    const user = await getAuthUser(request)

    if (!user) {
      logger.warn('Unauthorized access attempt')
      return {
        error: true,
        response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      }
    }

    const allowedRoles = Array.isArray(role) ? role : [role]

    if (!allowedRoles.includes(user.role)) {
      logger.warn('Forbidden access attempt', {
        userId: user.id,
        requiredRole: role,
        userRole: user.role,
      })
      return {
        error: true,
        response: NextResponse.json(
          { error: 'Forbidden: insufficient permissions' },
          { status: 403 }
        ),
      }
    }

    return { error: false, user }
  }
}

/**
 * Require any of multiple roles
 */
export async function requireAnyRole(
  request: NextRequest,
  allowedRoles: UserRole[]
) {
  const user = await getAuthUser(request)

  if (!user) {
    logger.warn('Unauthorized access attempt')
    return {
      error: true,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  if (!allowedRoles.includes(user.role)) {
    logger.warn('Forbidden access attempt', {
      userId: user.id,
      requiredRoles: allowedRoles,
      userRole: user.role,
    })
    return {
      error: true,
      response: NextResponse.json(
        { error: 'Forbidden: insufficient permissions' },
        { status: 403 }
      ),
    }
  }

  return { error: false, user }
}

/**
 * Check if user owns a resource (for sellers/customers)
 */
export async function userOwnsResource(userId: string, resourceOwnerId: string): Promise<boolean> {
  return userId === resourceOwnerId
}

/**
 * Check if seller owns a product
 */
export async function sellerOwnsProduct(sellerId: string, productId: string): Promise<boolean> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      return false
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const { data } = await supabase
      .from('products')
      .select('seller_id')
      .eq('id', productId)
      .single()

    return data?.seller_id === sellerId
  } catch (error) {
    logger.error('Error checking product ownership', { error })
    return false
  }
}

/**
 * Check if seller owns an order
 */
export async function sellerOwnsOrder(sellerId: string, orderId: string): Promise<boolean> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      return false
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const { data } = await supabase
      .from('order_items')
      .select('products(seller_id)')
      .eq('order_id', orderId)
      .limit(1)

    if (!data || data.length === 0) {
      return false
    }

    return (data[0].products as any)?.seller_id === sellerId
  } catch (error) {
    logger.error('Error checking order ownership', { error })
    return false
  }
}
