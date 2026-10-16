import { createAdminClient } from "@/lib/supabase/server-admin"
import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { getAuthUser, requireAnyRole } from "@/lib/auth/permissions"
import { logger } from "@/lib/logger"
import { rateLimiter } from "@/lib/rate-limit"

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const { allowed } = await rateLimiter.checkLimit(request, 'api')
    if (!allowed) {
      logger.warn('Rate limit exceeded on returns/seller-list')
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    // Authentication
    const user = await getAuthUser(request)
    if (!user) {
      logger.warn('Unauthorized access to returns/seller-list')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // RBAC - only sellers and admins can access
    const authCheck = await requireAnyRole(request, ['seller', 'admin'])
    if (authCheck.error) {
      return authCheck.response
    }

    const supabase = await createClient()

    // Get seller's products
    const { data: sellerProducts, error: productsError } = await supabase
      .from("products")
      .select("id")
      .eq("seller_id", user.id)

    if (productsError) {
      logger.error('Error fetching seller products', {
        userId: user.id,
        error: productsError.message,
      })
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 400 })
    }

    if (!sellerProducts || sellerProducts.length === 0) {
      logger.logApiAccess('GET', '/api/returns/seller-list', 200, {
        userId: user.id,
        resultCount: 0,
      })
      return NextResponse.json([])
    }

    const productIds = sellerProducts.map((p) => p.id)
    const adminClient = createAdminClient()

    const { data: returns, error } = await adminClient
      .from("returns")
      .select(
        `
        id,
        order_id,
        customer_id,
        product_id,
        reason,
        status,
        refund_amount,
        requested_at,
        description,
        profiles:customer_id(full_name, email),
        products:product_id(name, seller_id)
      `,
      )
      .in("product_id", productIds)
      .order("requested_at", { ascending: false })

    if (error) {
      logger.error('Error fetching seller returns', {
        userId: user.id,
        error: error.message,
      })
      return NextResponse.json({ error: 'Failed to fetch returns' }, { status: 400 })
    }

    logger.logApiAccess('GET', '/api/returns/seller-list', 200, {
      userId: user.id,
      resultCount: returns?.length || 0,
    })

    return NextResponse.json(returns || [])
  } catch (error) {
    logger.error('Error in returns/seller-list', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
