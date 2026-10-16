export type SupportedLanguage = "en" | "am"
export type SupportedCurrency = "ETB" | "USD" | "EUR"

export const DEFAULT_LANGUAGE: SupportedLanguage = "en"
export const DEFAULT_CURRENCY: SupportedCurrency = "ETB"

export const SUPPORTED_LANGUAGES: Array<{ code: SupportedLanguage; label: string }> = [
  { code: "en", label: "English" },
  { code: "am", label: "Amharic" },
]

export const SUPPORTED_CURRENCIES: Array<{ code: SupportedCurrency; label: string }> = [
  { code: "ETB", label: "ETB (Birr)" },
  { code: "USD", label: "USD ($)" },
  { code: "EUR", label: "EUR (EUR)" },
]

// Base currency is ETB. These are ONLY used as a last-resort fallback when
// live rates (see lib/exchange-rates.ts) can't be fetched - e.g. the very
// first request in a fresh environment, or the upstream FX API being down.
// They are deliberately not relied on for normal operation since exchange
// rates move over time and hardcoded numbers go stale.
export const FALLBACK_CURRENCY_RATES: Record<SupportedCurrency, number> = {
  ETB: 1,
  USD: 0.0063,
  EUR: 0.0054,
}

// Full site-wide translation dictionary lives in lib/translations.ts.
// Re-exported here so existing imports of TranslationKey/translate keep working.
import { en, am, type TranslationKey } from "@/lib/translations"
export type { TranslationKey }

const TRANSLATIONS: Record<SupportedLanguage, Record<TranslationKey, string>> = {
  en,
  am,
}

export function toFiniteAmount(value: number): number {
  return Number.isFinite(value) ? value : 0
}

export function convertFromETB(
  amountInEtb: number,
  currency: SupportedCurrency,
  rates: Record<SupportedCurrency, number> = FALLBACK_CURRENCY_RATES,
): number {
  const safeAmount = toFiniteAmount(amountInEtb)
  const rate = rates[currency] ?? FALLBACK_CURRENCY_RATES[currency] ?? 1
  return safeAmount * rate
}

export function getLocaleForLanguage(language: SupportedLanguage): string {
  return language === "am" ? "am-ET" : "en-US"
}

export function translate(
  language: SupportedLanguage,
  key: TranslationKey,
  vars?: Record<string, string | number>,
): string {
  const template = TRANSLATIONS[language]?.[key] ?? TRANSLATIONS[DEFAULT_LANGUAGE][key]
  if (!vars) return template
  return Object.entries(vars).reduce(
    (result, [varName, value]) => result.replaceAll(`{${varName}}`, String(value)),
    template,
  )
}
