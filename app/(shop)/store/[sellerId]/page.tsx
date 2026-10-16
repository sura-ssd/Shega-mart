import Link from "next/link"
import { notFound } from "next/navigation"
import { Store } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import { formatPriceForCurrency } from "@/lib/currency"
import { getServerPlatformPreferences } from "@/lib/platform-preferences-server"
import { translate } from "@/lib/platform-preferences"
import { ToggleWishlistButton } from "@/components/wishlist/toggle-wishlist-button"
import { ProductRatingBadge } from "@/components/products/product-rating-badge"
import { getProductRatingSummaries } from "@/lib/product-ratings"

export default async function SellerStorePage({ params }: { params: Promise<{ sellerId: string }> }) {
  const { sellerId } = await params
  const supabase = await createClient()
  const preferences = await getServerPlatformPreferences()
  const tr = (key: Parameters<typeof translate>[1]) => translate(preferences.language, key)
  const formatAmount = (value: number) =>
    formatPriceForCurrency(value, {
      currency: preferences.currency,
      locale: preferences.locale,
      rates: preferences.rates,
    })

  const { data: seller } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", sellerId)
    .eq("role", "seller")
    .maybeSingle()

  if (!seller) notFound()

  const { data: products } = await supabase
    .from("products")
    .select("id, name, description, image_url, price, stock, categories(name, slug)")
    .eq("seller_id", seller.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false })

  const storeName = seller.full_name?.trim() || "Seller"
  const storeProducts = products || []
  const ratingSummaries = await getProductRatingSummaries(supabase, storeProducts.map((product) => product.id))

  return (
    <main className="mx-auto w-full max-w-7xl px-3 py-6 sm:px-6 sm:py-12 lg:px-8">
      <header className="mb-6 border-b border-border/70 pb-5 sm:mb-9 sm:pb-6">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
          <Store className="h-4 w-4" /> Seller store
        </p>
        <h1 className="mt-2 break-words text-2xl font-bold tracking-tight sm:text-4xl">{storeName}&apos;s store</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {storeProducts.length} {storeProducts.length === 1 ? "product" : "products"}
        </p>
      </header>

      {storeProducts.length > 0 ? (
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {storeProducts.map((product) => {
            const categoryRelation = product.categories as
              | { name?: string | null }
              | Array<{ name?: string | null }>
              | null
            const categoryName = Array.isArray(categoryRelation) ? categoryRelation[0]?.name : categoryRelation?.name

            return (
              <div key={product.id} className="group relative flex h-full flex-col">
                <Link href={`/products/${product.id}`} className="block h-full">
                  <Card className="flex h-full flex-col overflow-hidden border-border/70">
                    <div className="relative aspect-[4/3] shrink-0 overflow-hidden bg-muted">
                      <img
                        src={product.image_url || `/placeholder.svg?height=500&width=700&query=${encodeURIComponent(product.name)}`}
                        alt={product.name}
                        className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        loading="lazy"
                        decoding="async"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-3 pt-8 sm:p-4 sm:pt-10">
                        <p className="line-clamp-1 text-sm font-semibold text-white sm:text-base">{product.name}</p>
                      </div>
                    </div>
                    <CardContent className="flex flex-1 flex-col justify-between gap-2 p-2.5 sm:gap-3 sm:p-4">
                      <div className="space-y-1.5">
                        <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                          {categoryName || tr("products.uncategorized")}
                        </p>
                        <ProductRatingBadge summary={ratingSummaries[product.id]} className="text-xs" />
                        <p className="line-clamp-2 text-[11px] leading-snug text-muted-foreground sm:text-sm">{product.description}</p>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-1 border-t border-border/70 pt-2">
                        <span className="text-sm font-semibold text-primary sm:text-base">{formatAmount(Number(product.price))}</span>
                        <span className="text-[10px] text-muted-foreground sm:text-xs">
                          {product.stock > 0 ? `${product.stock} ${tr("home.leftInStock")}` : tr("home.outOfStock")}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
                <div className="absolute right-2 top-2 z-10 sm:right-3 sm:top-3">
                  <ToggleWishlistButton
                    productId={product.id}
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 rounded-full bg-background/90 sm:h-8 sm:w-8"
                  />
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <p className="font-semibold">No active products yet</p>
          </CardContent>
        </Card>
      )}
    </main>
  )
}
