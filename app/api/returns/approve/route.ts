import { createAdminClient } from "@/lib/supabase/server-admin";
import { type NextRequest, NextResponse } from "next/server";
import { validateRequest } from "@/lib/schemas/validate";
import { getAuthUser, requireAnyRole } from "@/lib/auth/permissions";
import { logger } from "@/lib/logger";
import { rateLimiter } from "@/lib/rate-limit";
import { z } from "zod";
import { createNotification } from "@/lib/notifications/create-notification";


const ApproveReturnSchema = z.object({
  id: z.string().uuid("Invalid return ID"),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const { allowed } = await rateLimiter.checkLimit(request, "api");
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      );
    }

    // Authentication
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // RBAC
    const authCheck = await requireAnyRole(request, ["admin", "seller"]);
    if (authCheck.error) return authCheck.response;

    // Validate request
    const validation = await validateRequest(request, ApproveReturnSchema);
    if (!validation.success) {
      return validation.response;
    }

    const { id, notes } = validation.data;

    const adminClient = createAdminClient();

    // Fetch return details
    const { data: returnData, error: returnError } = await adminClient
      .from("returns")
      .select("product_id, order_id, customer_id, status, refund_amount")
      .eq("id", id)
      .single();

    if (returnError || !returnData) {
      return NextResponse.json(
        { error: "Return not found" },
        { status: 404 }
      );
    }

    if (returnData.status === "approved") {
      return NextResponse.json({ error: "Return is already approved" }, { status: 409 });
    }

    // Seller ownership check
    if (user.role === "seller") {
      const { data: productData, error: productError } = await adminClient
        .from("products")
        .select("seller_id")
        .eq("id", returnData.product_id)
        .single();

      if (
        productError ||
        !productData ||
        productData.seller_id !== user.id
      ) {
        return NextResponse.json(
          { error: "Forbidden - not your product" },
          { status: 403 }
        );
      }
    }

    
    const { data: updatedReturn, error: updateError } = await adminClient
      .from("returns")
      .update({
        status: "approved", 
        notes,
        approved_at: new Date().toISOString(),
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        auto_decision: false,
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      logger.error("Error approving return", {
        userId: user.id,
        returnId: id,
        error: updateError.message,
      });

      return NextResponse.json(
        { error: "Failed to approve return" },
        { status: 400 }
      );
    }

    // Restock inventory after approval.
    const { data: orderItemData } = await adminClient
      .from("order_items")
      .select("price")
      .eq("order_id", returnData.order_id)
      .eq("product_id", returnData.product_id)
      .single();

    const basePrice = Number(orderItemData?.price || 0)
    const refundAmount = Number(returnData.refund_amount || 0)
    const estimatedReturnQty = basePrice > 0 ? Math.max(1, Math.round(refundAmount / basePrice)) : 1

    const { data: productRow, error: stockFetchError } = await adminClient
      .from("products")
      .select("stock")
      .eq("id", returnData.product_id)
      .single();

    if (stockFetchError || !productRow) {
      logger.error("Error fetching product stock for return approval", {
        userId: user.id,
        returnId: id,
        productId: returnData.product_id,
      })
      return NextResponse.json({ error: "Return approved but stock update failed" }, { status: 500 })
    }

    const nextStock = Number(productRow.stock || 0) + estimatedReturnQty
    const { error: stockUpdateError } = await adminClient
      .from("products")
      .update({ stock: nextStock })
      .eq("id", returnData.product_id)

    if (stockUpdateError) {
      logger.error("Error restocking product after return approval", {
        userId: user.id,
        returnId: id,
        productId: returnData.product_id,
        error: stockUpdateError.message,
      })
      return NextResponse.json({ error: "Return approved but stock update failed" }, { status: 500 })
    }

    await createNotification({
      user_id: returnData.customer_id,
      title: "Return Approved",
      message: "Your return request was approved.",
      type: "return_approved",
      order_id: returnData.order_id,
    });

    logger.logReturn("approved", id, {
      userId: user.id,
      userRole: user.role,
      orderId: returnData.order_id,
    });

    return NextResponse.json(updatedReturn);
  } catch (error) {
    logger.error("Error in returns/approve", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}