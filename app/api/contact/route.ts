import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { rateLimiter } from "@/lib/rate-limit"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { createClient } from "@/lib/supabase/server"

const ContactSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(120),
  subject: z.string().trim().min(3).max(120),
  message: z.string().trim().min(10, "message must contain at least 10 character(s)").max(2000),
})

export async function POST(request: NextRequest) {
  try {
    const { allowed } = await rateLimiter.checkLimit(request, "api")
    if (!allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 })
    }

    const rawBody = await request.json()
    const parsed = ContactSchema.safeParse(rawBody)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      )
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const adminClient = createAdminClient()

    const { error } = await adminClient.from("contact_messages").insert({
      user_id: user?.id ?? null,
      name: parsed.data.name,
      email: parsed.data.email,
      subject: parsed.data.subject,
      message: parsed.data.message,
      status: "new",
    })

    if (error) {
      return NextResponse.json({ error: "Failed to submit message" }, { status: 500 })
    }

    return NextResponse.json({ message: "Message sent successfully" }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
