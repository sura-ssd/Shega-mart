import {
  convertFromETB,
  DEFAULT_CURRENCY,
  FALLBACK_CURRENCY_RATES,
  SupportedCurrency,
} from "@/lib/platform-preferences"

const ETB_SYMBOL = "Br"
const CURRENCY_CODE: SupportedCurrency = "ETB"

const CURRENCY_SYMBOL_MAP: Record<SupportedCurrency, string> = {
  ETB: ETB_SYMBOL,
  USD: "$",
  EUR: "EUR",
}

type CurrencyFormatOptions = {
  currency?: SupportedCurrency
  locale?: string
  rates?: Record<SupportedCurrency, number>
}

export function formatPrice(amount: number): string {
  return formatPriceForCurrency(amount, { currency: CURRENCY_CODE, locale: "en-US" })
}

export function formatCurrency(amount: number): string {
  return formatPriceForCurrency(amount, { currency: CURRENCY_CODE, locale: "en-US" })
}

export function formatPriceForCurrency(amountEtb: number, options: CurrencyFormatOptions = {}): string {
  const currency = options.currency || DEFAULT_CURRENCY
  const locale = options.locale || "en-US"
  const rates = options.rates || FALLBACK_CURRENCY_RATES
  const convertedAmount = convertFromETB(amountEtb, currency, rates)

  const formatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  const symbol = CURRENCY_SYMBOL_MAP[currency] || ETB_SYMBOL
  return `${symbol}${formatter.format(convertedAmount)}`
}

export function getCurrencySymbol(): string {
  return ETB_SYMBOL
}

export function getCurrencyCode(): string {
  return CURRENCY_CODE
}
