import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server-admin";
import { type NextRequest, NextResponse } from "next/server";
import { CreateReturnSchema } from "@/lib/schemas/orders";
import { getAuthUser, requireAnyRole } from "@/lib/auth/permissions";
import { logger } from "@/lib/logger";
import { rateLimiter } from "@/lib/rate-limit";
import { createNotification } from "@/lib/notifications/create-notification";
import { RETURN_POLICIES } from "@/lib/return-reasons";

type CreateReturnInput = {
  order_id: string;
  reason: string;
  items: {
    product_id: string;
    quantity: number;
  }[];
};

function normalizeBody(body: any): CreateReturnInput {
  let items: any[] = [];

  // Case 1: correct format already
  if (Array.isArray(body.items) && body.items.length > 0) {
    items = body.items;
  }

  // Case 2: single product_id sent 
  else if (body.product_id) {
    items = [
      {
        product_id: body.product_id,
        quantity: body.quantity ?? 1,
      },
    ];
  }

  return {
    order_id: body.order_id || body.orderId,
    reason: body.reason,
    items: items.map((i) => ({
      product_id: i.product_id || i.productId,
      quantity: i.quantity ?? i.qty ?? 1,
    })),
  };
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const { allowed } = await rateLimiter.checkLimit(request, "api");
    if (!allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // Auth
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Role check
    const authCheck = await requireAnyRole(request, ["customer", "admin"]);
    if (authCheck.error) return authCheck.response;

    // Read request
    const rawBody = await request.json();

    console.log("RAW REQUEST BODY:", rawBody);

    // Normalize
    const normalizedBody = normalizeBody(rawBody);

    console.log("NORMALIZED BODY:", normalizedBody);

    // Validate
    const parsed = CreateReturnSchema.safeParse(normalizedBody);

    if (!parsed.success) {
      console.error("VALIDATION ERROR:", parsed.error.flatten());

      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { order_id, reason, items } = parsed.data;

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "At least one item is required for return" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const adminClient = createAdminClient();

    // Verify order ownership and fetch order timestamp for policy checks
    const { data: orderData, error: orderError } = await adminClient
      .from("orders")
      .select("id, created_at")
      .eq("id", order_id)
      .eq("customer_id", user.id)
      .single();

    if (orderError || !orderData) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const reasonPolicy = RETURN_POLICIES[reason as keyof typeof RETURN_POLICIES] || RETURN_POLICIES.other;
    const orderCreatedAt = orderData?.created_at ? new Date(orderData.created_at) : null;
    const daysSinceOrder = orderCreatedAt
      ? Math.floor((Date.now() - orderCreatedAt.getTime()) / (1000 * 60 * 60 * 24))
      : Number.MAX_SAFE_INTEGER;

    let decisionStatus: "requested" | "approved" | "rejected" = "requested";
    let decisionRule: string | null = null;

    if (daysSinceOrder > reasonPolicy.days) {
      decisionStatus = "rejected";
      decisionRule = `outside_${reasonPolicy.days}_day_window`;
    } else if (reason === "damaged" || reason === "wrong_item") {
      decisionStatus = "approved";
      decisionRule = "auto_approve_priority_reason";
    }

    // Process returns
    const results = await Promise.all(
      items.map(async (item) => {
        const { data: itemData, error: itemError } = await adminClient
          .from("order_items")
          .select("price")
          .eq("order_id", order_id)
          .eq("product_id", item.product_id)
          .single();

        if (itemError || !itemData) return null;

        const { data, error } = await adminClient
          .from("returns")
          .insert({
            order_id,
            customer_id: user.id,
            product_id: item.product_id,
            reason,
            refund_amount: itemData.price * item.quantity,
            status: decisionStatus,
            auto_decision: decisionStatus !== "requested",
            decision_rule: decisionRule,
            approved_at: decisionStatus === "approved" ? new Date().toISOString() : null,
            reviewed_at: decisionStatus !== "requested" ? new Date().toISOString() : null,
            notes:
              decisionStatus === "requested"
                ? null
                : decisionStatus === "approved"
                  ? "Auto-approved by return rules"
                  : "Auto-rejected by return policy window",
          })
          .select()
          .single();

        if (error) {
          console.error("Return insert error:", error.message);
          return null;
        }

        if (decisionStatus === "approved") {
          const { data: productData, error: productError } = await adminClient
            .from("products")
            .select("stock")
            .eq("id", item.product_id)
            .single();

          if (productError || !productData) {
            console.error("Product stock fetch error for auto-approved return:", productError?.message);
            return null;
          }

          const updatedStock = Number(productData.stock || 0) + Number(item.quantity || 0);
          const { error: stockUpdateError } = await adminClient
            .from("products")
            .update({ stock: updatedStock })
            .eq("id", item.product_id);

          if (stockUpdateError) {
            console.error("Stock update error for auto-approved return:", stockUpdateError.message);
            return null;
          }
        }

        return data;
      }),
    );
    const customerTitle =
      decisionStatus === "approved"
        ? "Return Approved"
        : decisionStatus === "rejected"
          ? "Return Rejected"
          : "Return Requested";

    const customerMessage =
      decisionStatus === "approved"
        ? `Your return request for order #${order_id.slice(0, 8)} was auto-approved based on return policy.`
        : decisionStatus === "rejected"
          ? `Your return request for order #${order_id.slice(0, 8)} is outside the allowed return window and was auto-rejected.`
          : `Your return request for order #${order_id.slice(0, 8)} was submitted.`;

    await createNotification({
      user_id: user.id,
      title: customerTitle,
      message: customerMessage,
      type:
        decisionStatus === "approved"
          ? "return_approved"
          : decisionStatus === "rejected"
            ? "return_rejected"
            : "return_requested",
      order_id,
    });

    // ✅ SELLER NOTIFICATIONS
    const sellerIds = new Set<string>();

    for (const item of items) {
      const { data: productData } = await adminClient
        .from("products")
        .select("seller_id")
        .eq("id", item.product_id)
        .single();

      if (productData?.seller_id) {
        sellerIds.add(productData.seller_id);
      }
    }

    for (const sellerId of sellerIds) {
      await createNotification({
        user_id: sellerId,
        title:
          decisionStatus === "approved"
            ? "Return Auto-Approved"
            : decisionStatus === "rejected"
              ? "Return Auto-Rejected"
              : "New Return Request",
        message:
          decisionStatus === "approved"
            ? `A return for order #${order_id.slice(0, 8)} was auto-approved by policy.`
            : decisionStatus === "rejected"
              ? `A return for order #${order_id.slice(0, 8)} was auto-rejected by policy.`
              : `A customer requested a return for order #${order_id.slice(0, 8)}.`,
        type:
          decisionStatus === "approved"
            ? "return_approved"
            : decisionStatus === "rejected"
              ? "return_rejected"
              : "return_requested_seller",
        order_id,
      });
    }

    const returns = results.filter(Boolean);

    logger.logReturn("requested", returns[0]?.id || order_id, {
      userId: user.id,
      orderId: order_id,
      itemCount: items.length,
    });

    return NextResponse.json(returns, { status: 201 });
  } catch (error) {
    console.error("CREATE RETURN ERROR:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}