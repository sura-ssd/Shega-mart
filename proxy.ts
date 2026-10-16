import { updateSession } from "@/lib/supabase/middleware"
import type { NextRequest } from "next/server"
import { logger } from "@/lib/logger"

export async function proxy(request: NextRequest) {
  try {
    // Log API access for security audit
    if (request.nextUrl.pathname.startsWith('/api/')) {
      logger.logApiAccess(
        request.method,
        request.nextUrl.pathname,
        200, // Status is logged after response, this is just tracking
        {
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        }
      )
    }

    // Update session (handle auth)
    const response = await updateSession(request)
    return response
  } catch (error) {
    logger.error('Middleware error', {
      path: request.nextUrl.pathname,
      method: request.method,
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
