import { createAdminClient } from "@/lib/supabase/server-admin"
import { type NextRequest, NextResponse } from "next/server"
import { getAuthUser, requireRole } from "@/lib/auth/permissions"
import { logger } from "@/lib/logger"
import { rateLimiter } from "@/lib/rate-limit"

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const { allowed } = await rateLimiter.checkLimit(request, 'api')
    if (!allowed) {
      logger.warn('Rate limit exceeded on returns/admin-list')
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    // Authentication
    const user = await getAuthUser(request)
    if (!user) {
      logger.warn('Unauthorized access to returns/admin-list')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // RBAC - only admins can access this endpoint
    const authCheck = await requireRole('admin')(request)
    if (authCheck.error) {
      return authCheck.response
    }

    const adminClient = createAdminClient()

    // Fetch all returns with related data
    const { data: returns, error } = await adminClient
      .from("returns")
      .select(`
        *,
        profiles:customer_id(full_name, email),
        products(name),
        orders(id, order_number)
      `)
      .order("requested_at", { ascending: false })

    if (error) {
      logger.error('Error fetching admin returns', {
        userId: user.id,
        error: error.message,
      })
      return NextResponse.json({ error: 'Failed to fetch returns' }, { status: 400 })
    }

    logger.logApiAccess('GET', '/api/returns/admin-list', 200, {
      userId: user.id,
      resultCount: returns?.length || 0,
    })

    return NextResponse.json(returns)
  } catch (error) {
    logger.error('Error in returns/admin-list', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
