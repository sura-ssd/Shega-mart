"use client"

import { createContext, useContext, useEffect, useMemo, useState } from "react"
import {
  DEFAULT_CURRENCY,
  DEFAULT_LANGUAGE,
  FALLBACK_CURRENCY_RATES,
  getLocaleForLanguage,
  SUPPORTED_CURRENCIES,
  SUPPORTED_LANGUAGES,
  translate,
  type SupportedCurrency,
  type SupportedLanguage,
  type TranslationKey,
} from "@/lib/platform-preferences"
import { formatPriceForCurrency } from "@/lib/currency"

// How often the client re-checks for a fresh rate while the tab stays open.
// The API route itself is cached for an hour, so this just makes sure a
// long-lived tab eventually picks up a rate change without a full reload.
const CLIENT_RATE_REFRESH_MS = 60 * 60 * 1000

type PlatformPreferencesContextValue = {
  language: SupportedLanguage
  currency: SupportedCurrency
  setLanguage: (language: SupportedLanguage) => void
  setCurrency: (currency: SupportedCurrency) => void
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string
  formatAmount: (amountEtb: number) => string
  languageOptions: typeof SUPPORTED_LANGUAGES
  currencyOptions: typeof SUPPORTED_CURRENCIES
}

const PlatformPreferencesContext = createContext<PlatformPreferencesContextValue | null>(null)

const LANGUAGE_STORAGE_KEY = "sm-language"
const CURRENCY_STORAGE_KEY = "sm-currency"

export function PlatformPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>(DEFAULT_LANGUAGE)
  const [currency, setCurrencyState] = useState<SupportedCurrency>(DEFAULT_CURRENCY)
  const [rates, setRates] = useState<Record<SupportedCurrency, number>>(FALLBACK_CURRENCY_RATES)

  useEffect(() => {
    const storedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY) as SupportedLanguage | null
    const storedCurrency = localStorage.getItem(CURRENCY_STORAGE_KEY) as SupportedCurrency | null

    if (storedLanguage === "en" || storedLanguage === "am") {
      setLanguageState(storedLanguage)
      document.cookie = `sm-language=${storedLanguage}; path=/; max-age=31536000; samesite=lax`
    }

    if (storedCurrency === "ETB" || storedCurrency === "USD" || storedCurrency === "EUR") {
      setCurrencyState(storedCurrency)
      document.cookie = `sm-currency=${storedCurrency}; path=/; max-age=31536000; samesite=lax`
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadRates() {
      try {
        const response = await fetch("/api/exchange-rates")
        if (!response.ok) return
        const data = await response.json()
        if (!cancelled && data?.rates?.USD && data?.rates?.EUR) {
          setRates({ ETB: 1, USD: data.rates.USD, EUR: data.rates.EUR })
        }
      } catch {
        // Keep whatever rates we already have (fallback or last successful fetch).
      }
    }

    loadRates()
    const interval = setInterval(loadRates, CLIENT_RATE_REFRESH_MS)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  const setLanguage = (nextLanguage: SupportedLanguage) => {
    setLanguageState(nextLanguage)
    localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage)
    document.cookie = `sm-language=${nextLanguage}; path=/; max-age=31536000; samesite=lax`
  }

  const setCurrency = (nextCurrency: SupportedCurrency) => {
    setCurrencyState(nextCurrency)
    localStorage.setItem(CURRENCY_STORAGE_KEY, nextCurrency)
    document.cookie = `sm-currency=${nextCurrency}; path=/; max-age=31536000; samesite=lax`
  }

  const value = useMemo<PlatformPreferencesContextValue>(
    () => ({
      language,
      currency,
      setLanguage,
      setCurrency,
      t: (key: TranslationKey, vars?: Record<string, string | number>) => translate(language, key, vars),
      formatAmount: (amountEtb: number) =>
        formatPriceForCurrency(amountEtb, {
          currency,
          locale: getLocaleForLanguage(language),
          rates,
        }),
      languageOptions: SUPPORTED_LANGUAGES,
      currencyOptions: SUPPORTED_CURRENCIES,
    }),
    [currency, language, rates],
  )

  return <PlatformPreferencesContext.Provider value={value}>{children}</PlatformPreferencesContext.Provider>
}

export function usePlatformPreferences() {
  const context = useContext(PlatformPreferencesContext)
  if (!context) {
    throw new Error("usePlatformPreferences must be used within PlatformPreferencesProvider")
  }
  return context
}
