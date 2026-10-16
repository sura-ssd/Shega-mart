import { NextResponse } from "next/server"
import { getExchangeRates } from "@/lib/exchange-rates"

export async function GET() {
  const rates = await getExchangeRates()

  return NextResponse.json(
    { rates, fetchedAt: new Date().toISOString() },
    {
      headers: {
        // Let browsers/CDN cache this for a bit; matches the server-side
        // revalidation window in lib/exchange-rates.ts.
        "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  )
}
