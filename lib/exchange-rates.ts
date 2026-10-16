import { FALLBACK_CURRENCY_RATES, type SupportedCurrency } from "@/lib/platform-preferences"
import { logger } from "@/lib/logger"

// Free, no-API-key-required FX endpoint. Base currency is ETB, so the
// response already gives us "1 ETB = X <currency>" for every currency,
// which is exactly the shape CURRENCY_RATES expects.
const EXCHANGE_RATE_API_URL = "https://open.er-api.com/v6/latest/ETB"

// How long we're willing to serve a cached/live rate before refetching.
// FX rates for ETB don't move so fast that we need this to be near-real-time,
// but an hour keeps prices reasonably fresh without hammering the upstream API.
const REVALIDATE_SECONDS = 60 * 60

export type ExchangeRates = Record<SupportedCurrency, number>

type CachedRates = {
  rates: ExchangeRates
  fetchedAt: number
}

// In-memory fallback cache for environments/functions where Next's fetch
// cache isn't available (e.g. this module gets called outside a request).
let memoryCache: CachedRates | null = null

function isFreshEnough(fetchedAt: number): boolean {
  return Date.now() - fetchedAt < REVALIDATE_SECONDS * 1000
}

/**
 * Fetches live ETB-based exchange rates. Falls back to the last known-good
 * in-memory value, and finally to the static FALLBACK_CURRENCY_RATES if
 * nothing else is available (e.g. first request and the upstream API is down).
 */
export async function getExchangeRates(): Promise<ExchangeRates> {
  if (memoryCache && isFreshEnough(memoryCache.fetchedAt)) {
    return memoryCache.rates
  }

  try {
    const response = await fetch(EXCHANGE_RATE_API_URL, {
      // Let Next.js cache this across requests too, on top of our in-memory cache.
      next: { revalidate: REVALIDATE_SECONDS },
    })

    if (!response.ok) {
      throw new Error(`Exchange rate API responded with status ${response.status}`)
    }

    const data = await response.json()
    const apiRates = data?.rates

    if (!apiRates || typeof apiRates.USD !== "number" || typeof apiRates.EUR !== "number") {
      throw new Error("Exchange rate API returned an unexpected payload")
    }

    const rates: ExchangeRates = {
      ETB: 1,
      USD: apiRates.USD,
      EUR: apiRates.EUR,
    }

    memoryCache = { rates, fetchedAt: Date.now() }
    return rates
  } catch (error) {
    logger.error("Failed to fetch live exchange rates, falling back", {
      error: error instanceof Error ? error.message : String(error),
    })

    // Serve a stale cached value over the hardcoded fallback if we have one -
    // a rate from a few hours ago is still far more accurate than a rate
    // that's been hardcoded since the app was built.
    if (memoryCache) {
      return memoryCache.rates
    }

    return FALLBACK_CURRENCY_RATES
  }
}
