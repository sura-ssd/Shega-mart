import { z, ZodSchema } from 'zod'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Validates request body against a Zod schema
 * Returns parsed data or error response
 */
export async function validateRequest<Schema extends ZodSchema>(
  request: NextRequest,
  schema: Schema
): Promise<{ success: true; data: z.infer<Schema> } | { success: false; response: NextResponse }> {
  try {
    const body = await request.json()
    const result = schema.safeParse(body)

    if (!result.success) {
      const errors = result.error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }))

      return {
        success: false,
        response: NextResponse.json(
          { error: 'Validation failed', details: errors },
          { status: 400 }
        ),
      }
    }

    return { success: true, data: result.data }
  } catch (error) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      ),
    }
  }
}

/**
 * Validates query parameters against a Zod schema
 */
export async function validateQuery<T>(
  searchParams: URLSearchParams,
  schema: ZodSchema
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  const params: Record<string, any> = {}
  searchParams.forEach((value, key) => {
    params[key] = value
  })

  const result = schema.safeParse(params)

  if (!result.success) {
    const message = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
    return { success: false, error: message }
  }

  return { success: true, data: result.data as T }
}
