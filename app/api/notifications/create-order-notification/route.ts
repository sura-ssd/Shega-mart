import { type NextRequest, NextResponse } from "next/server";
import { validateRequest } from "@/lib/schemas/validate";
import { CreateNotificationSchema } from "@/lib/schemas/orders";
import { logger } from "@/lib/logger";
import { rateLimiter } from "@/lib/rate-limit";
import { createNotificationsFromEvent } from "@/lib/notifications/create-notification";

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const { allowed } = await rateLimiter.checkLimit(request, "api");
    if (!allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // 🔐 INTERNAL AUTH CHECK
    const internalSecret = request.headers.get("x-internal-secret");
    const expectedSecret = process.env.INTERNAL_API_SECRET;

    if (!expectedSecret) {
      logger.error("Missing INTERNAL_API_SECRET for internal notification endpoint", {
        endpoint: "/api/notifications/create-order-notification",
      });
      return NextResponse.json({ error: "Internal server misconfiguration" }, { status: 500 });
    }

    if (!internalSecret || internalSecret !== expectedSecret) {
      logger.warn("Unauthorized internal API access attempt", {
        endpoint: "/api/notifications/create-order-notification",
      });

      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate request
    const validation = await validateRequest(request, CreateNotificationSchema);

    if (!validation.success) {
      return validation.response;
    }

    const actorUserId = validation.data.customerId;
    if (!actorUserId) {
      return NextResponse.json(
        { error: "customerId is required for this endpoint" },
        { status: 400 }
      );
    }

    const result = await createNotificationsFromEvent(validation.data, actorUserId);

    if (!result.success) {
      logger.error("Notification insert failed", {
        error: result.error,
      });

      return NextResponse.json(
        { error: result.error || "Failed to create notifications" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      notificationsCreated: result.count,
    });
  } catch (error) {
    logger.error("Notification API error", {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}