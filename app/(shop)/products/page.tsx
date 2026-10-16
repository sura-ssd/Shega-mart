import Link from "next/link"

import { Card, CardContent } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import { formatPriceForCurrency } from "@/lib/currency"
import { getServerPlatformPreferences } from "@/lib/platform-preferences-server"
import { translate } from "@/lib/platform-preferences"
import { ToggleWishlistButton } from "@/components/wishlist/toggle-wishlist-button"
import { ProductRatingBadge } from "@/components/products/product-rating-badge"
import { getProductRatingSummaries } from "@/lib/product-ratings"

type ProductsPageProps = {
  searchParams?: Promise<{
    search?: string
    category?: string
    sort?: string
    min?: string
    max?: string
    inStock?: string
  }>
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const supabase = await createClient()
  const preferences = await getServerPlatformPreferences()
  const lang = preferences.language
  const tr = (key: Parameters<typeof translate>[1]) => translate(lang, key)
  const formatAmount = (value: number) =>
    formatPriceForCurrency(value, {
      currency: preferences.currency,
      locale: preferences.locale,
      rates: preferences.rates,
    })
  const resolvedSearchParams = await searchParams
  const search = resolvedSearchParams?.search?.trim() || ""
  const category = resolvedSearchParams?.category?.trim() || ""
  const sort = resolvedSearchParams?.sort?.trim() || "newest"
  const min = resolvedSearchParams?.min?.trim() || ""
  const max = resolvedSearchParams?.max?.trim() || ""
  const inStockOnly = resolvedSearchParams?.inStock === "1"

  const minPrice = Number(min)
  const maxPrice = Number(max)

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, slug")
    .order("name", { ascending: true })

  let query = supabase
    .from("products")
    .select("id, name, description, image_url, price, stock, categories(name, slug)")
    .eq("is_active", true)
    .limit(24)

  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
  }

  if (category) {
    query = query.eq("categories.slug", category)
  }

  if (!Number.isNaN(minPrice) && minPrice > 0) {
    query = query.gte("price", minPrice)
  }

  if (!Number.isNaN(maxPrice) && maxPrice > 0) {
    query = query.lte("price", maxPrice)
  }

  if (inStockOnly) {
    query = query.gt("stock", 0)
  }

  if (sort === "price_asc") {
    query = query.order("price", { ascending: true })
  } else if (sort === "price_desc") {
    query = query.order("price", { ascending: false })
  } else if (sort === "name") {
    query = query.order("name", { ascending: true })
  } else {
    query = query.order("created_at", { ascending: false })
  }

  const { data: products } = await query
  const productResults = products || []
  const ratingSummaries = await getProductRatingSummaries(supabase, productResults.map((product) => product.id))

  return (
    <div className="mx-auto w-full max-w-7xl px-3 py-6 sm:px-6 sm:py-12 lg:px-8">
      <div className="mb-5 sm:mb-8">
        <p className="text-xs uppercase tracking-[0.16em] text-primary">{tr("products.catalog")}</p>
        <h1 className="mt-1.5 text-2xl font-bold sm:mt-2 sm:text-4xl">{tr("products.title")}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground sm:mt-2">{tr("products.subtitle")}</p>
        {search ? <p className="mt-3 text-sm text-muted-foreground">{tr("products.searchResultsFor")} "{search}"</p> : null}
      </div>

      <form className="mb-5 grid grid-cols-2 gap-2 rounded-xl border border-border/70 bg-card/40 p-3 sm:mb-6 sm:gap-3 sm:rounded-2xl sm:p-4 sm:grid-cols-2 lg:grid-cols-6" method="GET">
        <input
          name="search"
          defaultValue={search}
          placeholder={tr("products.searchPlaceholder")}
          className="col-span-2 h-10 min-w-0 rounded-lg border border-border/80 bg-background px-3 text-sm lg:col-span-2"
        />
        <select name="category" defaultValue={category} className="h-10 rounded-lg border border-border/80 bg-background px-3 text-sm">
          <option value="">{tr("products.allCategories")}</option>
          {(categories || []).map((c) => (
            <option key={c.id} value={c.slug}>{c.name}</option>
          ))}
        </select>
        <select name="sort" defaultValue={sort} className="h-10 rounded-lg border border-border/80 bg-background px-3 text-sm">
          <option value="newest">{tr("products.sortNewest")}</option>
          <option value="price_asc">{tr("products.sortPriceAsc")}</option>
          <option value="price_desc">{tr("products.sortPriceDesc")}</option>
          <option value="name">{tr("products.sortName")}</option>
        </select>
        <input name="min" defaultValue={min} placeholder={tr("products.min")} className="h-10 rounded-lg border border-border/80 bg-background px-3 text-sm" />
        <input name="max" defaultValue={max} placeholder={tr("products.max")} className="h-10 rounded-lg border border-border/80 bg-background px-3 text-sm" />
        <label className="col-span-2 flex min-h-10 items-center gap-2 text-sm lg:col-span-2">
          <input type="checkbox" name="inStock" value="1" defaultChecked={inStockOnly} /> {tr("products.inStockOnly")}
        </label>
        <div className="col-span-2 flex gap-2 sm:justify-end lg:col-span-4">
          <button type="submit" className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">{tr("common.apply")}</button>
          <Link href="/products" className="inline-flex h-10 items-center rounded-lg border border-border/80 px-4 text-sm">{tr("common.reset")}</Link>
        </div>
      </form>

      {productResults.length > 0 ? (
        /* grid items will have equal height out of the box due to stretching behavior */
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {productResults.map((product) => {
            const relation = product.categories as { name?: string | null } | Array<{ name?: string | null }> | null
            const categoryName = Array.isArray(relation) ? relation[0]?.name : relation?.name

            return (
              /* Added h-full to anchor anchor wrapper */
              <div key={product.id} className="group relative flex flex-col h-full">
                <Link href={`/products/${product.id}`} className="block h-full">
                  {/* MODIFIED: Added flex flex-col h-full to Card */}
                  <Card className="flex flex-col h-full overflow-hidden border-border/70">
                    <div className="relative aspect-[4/3] overflow-hidden shrink-0">
                      <img
                        src={product.image_url || `/placeholder.svg?height=500&width=700&query=${product.name}`}
                        alt={product.name}
                        className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-110"
                        loading="lazy"
                        decoding="async"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                      {product.stock <= 0 && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/45 backdrop-blur-sm">
                          <span className="rounded-full border border-white/30 bg-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-white sm:px-3 sm:py-1 sm:text-xs">
                            {tr("home.outOfStock")}
                          </span>
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
                        <p className="line-clamp-1 text-base font-semibold text-white sm:text-lg">{product.name}</p>
                      </div>
                    </div>

                    {/* MODIFIED: Added flex-1 flex flex-col justify-between to balance layout heights */}
                    <CardContent className="flex flex-1 flex-col justify-between space-y-2 p-2.5 sm:space-y-3 sm:p-4">
                      <div className="space-y-1 sm:space-y-1.5">
                        <p className="line-clamp-1 text-[9px] uppercase tracking-[0.06em] text-muted-foreground sm:text-[11px] sm:tracking-[0.08em]">{categoryName || tr("products.uncategorized")}</p>
                        <ProductRatingBadge summary={ratingSummaries[product.id]} className="text-xs" />
                        <p className="line-clamp-2 text-[11px] leading-snug text-muted-foreground sm:text-sm">{product.description}</p>
                      </div>
                      
                      {/* Price and stock block is now perfectly pinned to the absolute bottom of CardContent */}
                      <div className="flex flex-wrap items-center justify-between gap-1 border-t border-border/70 pt-2 shrink-0">
                        <span className="text-sm font-semibold text-primary sm:text-base">{formatAmount(Number(product.price))}</span>
                        <span className="text-[10px] sm:text-xs text-muted-foreground">{product.stock > 0 ? `${product.stock} ${tr("home.leftInStock")}` : tr("home.outOfStock")}</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
                <div className="absolute right-2 top-2 z-10 sm:right-3 sm:top-3">
                  <ToggleWishlistButton productId={product.id} variant="outline" size="icon" className="h-7 w-7 rounded-full bg-background/90 sm:h-8 sm:w-8" />
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <Card className="rounded-2xl border-dashed">
          <CardContent className="py-16 text-center">
            <p className="text-lg font-semibold">{tr("products.noneFoundTitle")}</p>
            <p className="mt-2 text-sm text-muted-foreground">{tr("products.noneFoundSubtitle")}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}