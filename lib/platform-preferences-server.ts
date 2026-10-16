import { cookies } from "next/headers"
import { formatPriceForCurrency } from "@/lib/currency"
import { getExchangeRates } from "@/lib/exchange-rates"
import {
  DEFAULT_CURRENCY,
  DEFAULT_LANGUAGE,
  getLocaleForLanguage,
  SupportedCurrency,
  SupportedLanguage,
  translate,
  type TranslationKey,
} from "@/lib/platform-preferences"

function normalizeLanguage(value: string | undefined): SupportedLanguage {
  return value === "am" ? "am" : DEFAULT_LANGUAGE
}

function normalizeCurrency(value: string | undefined): SupportedCurrency {
  if (value === "USD" || value === "EUR" || value === "ETB") {
    return value
  }
  return DEFAULT_CURRENCY
}

export async function getServerPlatformPreferences() {
  const [cookieStore, rates] = await Promise.all([cookies(), getExchangeRates()])
  const language = normalizeLanguage(cookieStore.get("sm-language")?.value)
  const currency = normalizeCurrency(cookieStore.get("sm-currency")?.value)

  return {
    language,
    currency,
    locale: getLocaleForLanguage(language),
    rates,
  }
}

export async function formatServerAmount(amountEtb: number): Promise<string> {
  const preferences = await getServerPlatformPreferences()
  return formatPriceForCurrency(amountEtb, {
    currency: preferences.currency,
    locale: preferences.locale,
    rates: preferences.rates,
  })
}

export async function tServer(key: TranslationKey): Promise<string> {
  const preferences = await getServerPlatformPreferences()
  return translate(preferences.language, key)
}
