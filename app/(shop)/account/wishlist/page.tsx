import Link from "next/link"
import { redirect } from "next/navigation"

import { Card, CardContent } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import { formatPrice } from "@/lib/currency"
import { ToggleWishlistButton } from "@/components/wishlist/toggle-wishlist-button"
import { getServerPlatformPreferences } from "@/lib/platform-preferences-server"
import { translate } from "@/lib/platform-preferences"
import { ProductRatingBadge } from "@/components/products/product-rating-badge"
import { getProductRatingSummaries } from "@/lib/product-ratings"

export default async function WishlistPage() {
  const supabase = await createClient()
  const preferences = await getServerPlatformPreferences()
  const tr = (key: Parameters<typeof translate>[1]) => translate(preferences.language, key)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: wishlistItems } = await supabase
    .from("wishlist_items")
    .select("id, product_id, products:product_id(id, name, description, image_url, price, stock)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  const items = (wishlistItems || []).filter((item: any) => !!item.products)
  const ratingSummaries = await getProductRatingSummaries(
    supabase,
    items.map((item: any) => item.products.id),
  )

  return (
    <div className="mx-auto w-full max-w-7xl px-3 py-6 sm:px-6 sm:py-12 lg:px-8">
      <div className="mb-5 sm:mb-8">
        <p className="text-xs uppercase tracking-[0.16em] text-primary">{tr("account.saved")}</p>
        <h1 className="mt-1.5 text-2xl font-bold sm:mt-2 sm:text-4xl">{tr("account.myWishlist")}</h1>
      </div>

      {items.length > 0 ? (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item: any) => {
            const product = item.products
            return (
              <div key={item.id} className="group relative">
                <Link href={`/products/${product.id}`} className="block">
                  <Card className="h-full overflow-hidden border-border/70">
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <img
                        src={product.image_url || `/placeholder.svg?height=500&width=700&query=${product.name}`}
                        alt={product.name}
                        className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-110"
                        loading="lazy"
                        decoding="async"
                      />
                      {product.stock <= 0 && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/45 backdrop-blur-sm">
                          <span className="rounded-full border border-white/30 bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-white">
                            {tr("home.outOfStock")}
                          </span>
                        </div>
                      )}
                    </div>
                    <CardContent className="space-y-1.5 p-2.5 sm:space-y-2 sm:p-4">
                      <p className="line-clamp-1 text-sm font-semibold sm:text-base">{product.name}</p>
                      <ProductRatingBadge summary={ratingSummaries[product.id]} className="text-xs" />
                      <p className="line-clamp-2 text-[11px] leading-snug text-muted-foreground sm:text-sm">{product.description}</p>
                      <div className="flex items-center justify-between border-t border-border/70 pt-2">
                        <span className="text-sm font-semibold text-primary sm:text-base">{formatPrice(Number(product.price))}</span>
                        <span className="text-[9px] text-muted-foreground sm:text-xs">
                          {product.stock > 0 ? `${product.stock} ${tr("home.leftInStock")}` : tr("home.outOfStock")}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
                <div className="absolute right-3 top-3 z-10">
                  <ToggleWishlistButton productId={product.id} variant="outline" size="icon" className="h-8 w-8 rounded-full bg-background/90" />
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <Card className="rounded-2xl border-dashed">
          <CardContent className="py-16 text-center">
            <p className="text-lg font-semibold">{tr("account.noWishlistTitle")}</p>
            <p className="mt-2 text-sm text-muted-foreground">{tr("account.noWishlistSubtitle")}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
