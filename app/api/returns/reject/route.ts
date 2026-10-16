import { createAdminClient } from "@/lib/supabase/server-admin"
import { type NextRequest, NextResponse } from "next/server"
import { validateRequest } from "@/lib/schemas/validate"
import { UpdateReturnStatusSchema } from "@/lib/schemas/orders"
import { getAuthUser, requireAnyRole } from "@/lib/auth/permissions"
import { logger } from "@/lib/logger"
import { rateLimiter } from "@/lib/rate-limit"
import { z } from "zod"
import { createNotification } from "@/lib/notifications/create-notification";

const RejectReturnSchema = z.object({
  id: z.string().uuid("Invalid return ID"),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const { allowed } = await rateLimiter.checkLimit(request, 'api')
    if (!allowed) {
      logger.warn('Rate limit exceeded on returns/reject')
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    // Authentication
    const user = await getAuthUser(request)
    if (!user) {
      logger.warn('Unauthorized access to returns/reject')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // RBAC - only admins and sellers can reject returns
    const authCheck = await requireAnyRole(request, ['admin', 'seller'])
    if (authCheck.error) {
      return authCheck.response
    }

    // Validate request
    const validation = await validateRequest(request, RejectReturnSchema)
    if (!validation.success) {
      return validation.response
    }

    const { id, notes } = validation.data

    const adminClient = createAdminClient()

    // Fetch return details
    const { data: returnData, error: returnError } = await adminClient
      .from('returns')
      .select('product_id, order_id, customer_id')
      .eq('id', id)
      .single()

    if (returnError || !returnData) {
      logger.warn('Return not found for rejection', {
        userId: user.id,
        returnId: id,
      })
      return NextResponse.json({ error: 'Return not found' }, { status: 404 })
    }

    // If seller, verify they own the product
    if (user.role === 'seller') {
      const { data: productData, error: productError } = await adminClient
        .from('products')
        .select('seller_id')
        .eq('id', returnData.product_id)
        .single()

      if (productError || !productData || productData.seller_id !== user.id) {
        logger.warn('Seller attempting to reject non-own product return', {
          userId: user.id,
          returnId: id,
          productId: returnData.product_id,
        })
        return NextResponse.json({ error: 'Forbidden - not your product' }, { status: 403 })
      }
    }

    // Update the return
    const { data: updatedReturn, error: updateError } = await adminClient
      .from('returns')
      .update({
        status: "rejected",
        notes,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        auto_decision: false,
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      logger.error('Error rejecting return', {
        userId: user.id,
        returnId: id,
        error: updateError.message,
      })
      return NextResponse.json({ error: 'Failed to reject return' }, { status: 400 })
    }
    await createNotification({
      user_id: returnData.customer_id,
      title: "Return Rejected",
      message: "Your return request was rejected.",
      type: "return_rejected",
      order_id: returnData.order_id,
    });

    logger.logReturn('rejected', id, {
      userId: user.id,
      userRole: user.role,
      orderId: returnData.order_id,
    })

    return NextResponse.json(updatedReturn)
  } catch (error) {
    logger.error('Error in returns/reject', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
