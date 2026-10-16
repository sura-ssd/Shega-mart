import { createAdminClient } from "@/lib/supabase/server-admin"
import { type NextRequest, NextResponse } from "next/server"
import { validateRequest } from "@/lib/schemas/validate"
import { UpdateOrderStatusSchema } from "@/lib/schemas/orders"
import { getAuthUser, requireAnyRole } from "@/lib/auth/permissions"
import { logger } from "@/lib/logger"
import { rateLimiter } from "@/lib/rate-limit"

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const { allowed } = await rateLimiter.checkLimit(request, 'orders')
    if (!allowed) {
      logger.warn('Rate limit exceeded on orders/update-status')
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    // Authentication
    const user = await getAuthUser(request)
    if (!user) {
      logger.warn('Unauthorized access attempt to orders/update-status')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // RBAC - only customers, sellers, and admins can update orders
    const authCheck = await requireAnyRole(request, ['customer', 'seller', 'admin'])
    if (authCheck.error) {
      return authCheck.response
    }

    // Validate request
    const validation = await validateRequest(request, UpdateOrderStatusSchema)
    if (!validation.success) {
      return validation.response
    }

    const { order_id, status, notes } = validation.data

    const adminClient = createAdminClient()

    // Verify user has permission to update this order
    const { data: orderData, error: fetchError } = await adminClient
      .from("orders")
      .select("customer_id")
      .eq("id", order_id)
      .single()

    if (fetchError || !orderData) {
      logger.warn('Order not found', {
        userId: user.id,
        orderId: order_id,
      })
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // Only customer (owner), seller, or admin can update
    if (user.role === 'customer' && orderData.customer_id !== user.id) {
      logger.warn('Unauthorized order update attempt', {
        userId: user.id,
        orderId: order_id,
        userRole: user.role,
      })
      return NextResponse.json({ error: "Unauthorized - not your order" }, { status: 403 })
    }

    // Update the order status
    const { data: updatedOrder, error: updateError } = await adminClient
      .from("orders")
      .update({ status, notes })
      .eq("id", order_id)
      .select()
      .single()

    if (updateError) {
      logger.error('Error updating order status', {
        orderId: order_id,
        error: updateError.message,
      })
      return NextResponse.json({ error: 'Failed to update order' }, { status: 400 })
    }

    logger.logOrder('updated', order_id, {
      userId: user.id,
      newStatus: status,
      userRole: user.role,
    })

    return NextResponse.json(updatedOrder)
  } catch (error) {
    logger.error('Error in update order status', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
