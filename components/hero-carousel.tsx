"use client"

import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Loader2, Search } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { usePlatformPreferences } from "@/components/providers/platform-preferences-provider"
import { useEffect, useMemo, useRef, useState } from "react"

type ProductSearchSuggestion = {
  id: string
  name: string
  image_url: string | null
  price: number | string
  stock: number
}

const popularSearches = [
  { label: "Clothing", query: "clothing" },
  { label: "Shoes", query: "shoes" },
  { label: "Electronics", query: "electronics" },
]

export function HeroCarousel() {
  const { t, formatAmount } = usePlatformPreferences()
  const [query, setQuery] = useState("")
  const [suggestions, setSuggestions] = useState<ProductSearchSuggestion[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const searchContainerRef = useRef<HTMLDivElement | null>(null)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener("mousedown", closeOnOutsideClick)
    return () => document.removeEventListener("mousedown", closeOnOutsideClick)
  }, [])

  useEffect(() => {
    let cancelled = false
    const normalizedQuery = query.trim()

    if (normalizedQuery.length < 2) {
      setSuggestions([])
      setIsSearching(false)
      setShowSuggestions(false)
      return
    }

    setIsSearching(true)
    const debounce = window.setTimeout(async () => {
      const safeQuery = normalizedQuery.replace(/[,%()]/g, " ").trim()
      const { data, error } = await supabase
        .from("products")
        .select("id, name, image_url, price, stock")
        .eq("is_active", true)
        .or(`name.ilike.%${safeQuery}%,description.ilike.%${safeQuery}%`)
        .limit(6)

      if (cancelled) return
      setSuggestions(error ? [] : (data as ProductSearchSuggestion[]) || [])
      setIsSearching(false)
      setShowSuggestions(true)
    }, 250)

    return () => {
      cancelled = true
      window.clearTimeout(debounce)
    }
  }, [query, supabase])

  return (
    <section className="relative isolate min-h-[430px] overflow-hidden rounded-2xl bg-neutral-950 shadow-[0_28px_80px_-40px_color-mix(in_oklch,var(--foreground)_42%,transparent)] sm:min-h-[560px] sm:rounded-[2rem] lg:min-h-[660px]">
      <Image
        src="/pexels-cottonbro-3944405.jpg"
        alt="Fashion model wearing a contemporary outfit"
        fill
        priority
        sizes="100vw"
        className="-z-20 object-cover object-[62%_center]"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/80 via-black/55 to-black/15" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/60 via-transparent to-black/10" />

      <div className="flex min-h-[430px] flex-col justify-center px-5 py-8 sm:min-h-[560px] sm:px-10 sm:py-12 lg:min-h-[660px] lg:px-16">
        <div className="max-w-4xl animate-fade-in">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-white/75 sm:text-sm">
            {t("home.searchHeroEyebrow")}
          </p>
          <h1 className="max-w-4xl text-balance font-display text-3xl font-extrabold uppercase leading-[1.02] text-white sm:text-6xl sm:leading-[0.98] lg:text-7xl">
            {t("home.searchHeroTitle")} <span className="text-accent">{t("home.searchHeroHighlight")}</span>
          </h1>

          <div ref={searchContainerRef} className="relative mt-6 w-full max-w-2xl sm:mt-10">
            <form
              action="/products"
              method="get"
              className="flex h-14 w-full items-center gap-2 rounded-xl bg-white p-1.5 pl-3 shadow-[0_20px_55px_-28px_rgba(0,0,0,0.65)] sm:h-[76px] sm:gap-3 sm:rounded-[1.5rem] sm:p-2.5 sm:pl-6"
            >
              <Search className="h-5 w-5 shrink-0 text-neutral-400 sm:h-6 sm:w-6" aria-hidden="true" />
              <input
                name="search"
                type="search"
                defaultValue={query}
                onChange={(event) => setQuery(event.target.value)}
                onFocus={() => {
                  if (query.trim().length >= 2) setShowSuggestions(true)
                }}
                placeholder={t("home.searchHeroPlaceholder")}
                aria-label={t("home.searchHeroPlaceholder")}
                aria-autocomplete="list"
                aria-expanded={showSuggestions && query.trim().length >= 2}
                className="h-full min-w-0 flex-1 bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-400 sm:text-lg"
              />
              <button
                type="submit"
                aria-label={t("home.searchHeroSubmit")}
                className="flex h-11 w-12 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition duration-200 hover:scale-[1.03] hover:brightness-110 active:scale-95 sm:h-14 sm:w-[72px] sm:rounded-2xl"
              >
                <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            </form>

            {showSuggestions && query.trim().length >= 2 && (
              <div className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-30 max-h-80 overflow-y-auto rounded-xl border border-border/70 bg-popover/95 p-2 text-popover-foreground shadow-2xl backdrop-blur sm:rounded-2xl">
                {isSearching ? (
                  <div className="flex items-center justify-center gap-2 px-3 py-4 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("header.searching")}
                  </div>
                ) : suggestions.length > 0 ? (
                  <div className="space-y-1">
                    {suggestions.map((product) => (
                      <Link
                        key={product.id}
                        href={`/products/${product.id}`}
                        onClick={() => setShowSuggestions(false)}
                        className="flex items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted/60"
                      >
                        <img
                          src={product.image_url || `/placeholder.svg?height=80&width=80&query=${encodeURIComponent(product.name)}`}
                          alt=""
                          className="h-10 w-10 shrink-0 rounded-md object-cover"
                          loading="lazy"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block line-clamp-1 text-sm font-medium">{product.name}</span>
                          <span className="block text-xs text-muted-foreground">{formatAmount(Number(product.price))}</span>
                        </span>
                        {product.stock <= 0 && <span className="shrink-0 text-[10px] font-semibold uppercase text-destructive">{t("header.outOfStockBadge")}</span>}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="px-3 py-4 text-sm text-muted-foreground">{t("header.noMatchingItems")}</p>
                )}
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/85 sm:mt-7 sm:gap-x-7 sm:text-sm">
            <span className="text-white/60">{t("home.searchHeroPopular")}</span>
            {popularSearches.map((item) => (
              <Link
                key={item.query}
                href={`/products?search=${encodeURIComponent(item.query)}`}
                className="transition-colors hover:text-accent"
              >
                #{item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
