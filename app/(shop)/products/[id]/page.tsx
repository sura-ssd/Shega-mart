import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import HoverInfo from "@/components/ui/hover-info"
import { Badge } from "@/components/ui/badge"
import { Package, Shield, Truck, AlertCircle, Edit, Store } from "lucide-react"
import { AddToCartButton } from "@/components/cart/add-to-cart-button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { formatPriceForCurrency } from "@/lib/currency"
import { ToggleWishlistButton } from "@/components/wishlist/toggle-wishlist-button"
import { ProductReviews } from "@/components/products/product-reviews"
import { getServerPlatformPreferences } from "@/lib/platform-preferences-server"
import { translate } from "@/lib/platform-preferences"
import { ProductImageGallery } from "@/components/products/product-image-gallery"
import { ProductVariantProvider } from "@/components/products/product-variant-provider"
import { ProductVariantOptions } from "@/components/products/product-variant-options"
import { ProductRatingBadge } from "@/components/products/product-rating-badge"
import { getProductRatingSummaries } from "@/lib/product-ratings"
import { isModelVariantCategory } from "@/lib/product-variants"

function getErrorDetails(error: unknown) {
  if (!error) return "Unknown error"

  if (error instanceof Error) {
    return `${error.name}: ${error.message}`
  }

  if (typeof error === "object") {
    const value = error as Record<string, unknown>
    return JSON.stringify({
      message: value.message,
      details: value.details,
      hint: value.hint,
      code: value.code,
      digest: value.digest,
    })
  }

  return String(error)
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const preferences = await getServerPlatformPreferences()
  const tr = (key: Parameters<typeof translate>[1]) => translate(preferences.language, key)
  const formatAmount = (value: number) =>
    formatPriceForCurrency(value, {
      currency: preferences.currency,
      locale: preferences.locale,
      rates: preferences.rates,
    })

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()
  let userProfile = null
  if (authUser) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", authUser.id)
      .single()
    userProfile = profile
  }

  let product = null
  let error = null

  try {
    const { data, error: fetchError } = await supabase
      .from("products")
      .select(
        "id, name, description, image_url, image_urls, size_options, color_options, variant_images, variant_stock, price, stock, categories(name, slug), seller:profiles!products_seller_id_fkey(id, full_name, email, phone, role)"
      )
      .eq("id", id)
      .single()

    if (fetchError) throw fetchError
    product = data
  } catch (e) {
    console.error("[v0] Error fetching product:", getErrorDetails(e))
    error = e
  }

  if (error) {
    return (
      <div className="container py-8">
        <Alert variant="destructive" className="mx-auto max-w-2xl">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Database Connection Issue</AlertTitle>
          <AlertDescription>
            Unable to load this product. Please make sure the database is set up by running the SQL scripts. If you've
            already done this, the database may be starting up.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!product) {
    notFound()
  }

  const isSeller = userProfile?.role === "seller"
  const category = Array.isArray(product.categories) ? product.categories[0] : product.categories
  const sellerProfile = Array.isArray(product.seller) ? product.seller[0] : product.seller
  const sizeOptions = Array.isArray(product.size_options) ? product.size_options : []
  const colorOptions = Array.isArray(product.color_options) ? product.color_options : []
  const variantImages = product.variant_images && typeof product.variant_images === "object" && !Array.isArray(product.variant_images)
    ? product.variant_images as Record<string, string>
    : {}
  const variantStock = product.variant_stock && typeof product.variant_stock === "object" && !Array.isArray(product.variant_stock)
    ? Object.fromEntries(
        Object.entries(product.variant_stock).map(([key, value]) => [key, Number(value) || 0]),
      ) as Record<string, number>
    : {}
  const isElectronicsProduct = isModelVariantCategory(category?.name, category?.slug)
  const isFashionProduct = [category?.name, category?.slug].some((value) =>
    [
      "clothing",
      "fashion",
      "apparel",
      "shirt",
      "dress",
      "jacket",
      "hoodie",
      "pants",
      "jeans",
      "trouser",
      "suit",
      "shoes",
      "shoe",
      "sneaker",
      "boot",
      "sandals",
      "heels",
      "footwear",
      "accessories",
      "electronics",
      "phone",
      "smartphone",
      "laptop",
      "computer",
      "tablet",
      "headphone",
      "earbuds",
      "speaker",
      "tv",
      "monitor",
      "camera",
      "gaming",
      "gadget",
    ].some((keyword) => (value || "").toLowerCase().includes(keyword)),
  )
  const productImages = Array.from(
    new Set([
      ...(Array.isArray(product.image_urls) ? product.image_urls : []),
      ...(product.image_url ? [product.image_url] : []),
    ]),
  )
  const ratingSummaries = await getProductRatingSummaries(supabase, [product.id])

  return (
    <ProductVariantProvider
      variantImages={variantImages}
      variantStock={variantStock}
      stock={Number(product.stock)}
      primaryAttribute={isElectronicsProduct ? "model" : "size"}
      primaryOptions={sizeOptions}
      colorOptions={colorOptions}
    >
    <div className="mx-auto w-full max-w-7xl px-3 py-5 sm:px-6 sm:py-12 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-2 lg:gap-12">
        <ProductImageGallery productName={product.name} images={productImages} />

        <div className="flex flex-col animate-fade-in">
          <div className="mb-5 sm:mb-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <Badge variant="secondary" className="text-sm px-3 py-1">
                {category?.name}
              </Badge>
              <ToggleWishlistButton productId={product.id} variant="outline" size="icon" className="rounded-full" />
            </div>
            <HoverInfo content={product.name}>
              <h1 className="mb-2 line-clamp-2 text-3xl font-bold leading-tight tracking-tight sm:mb-3 sm:text-4xl md:text-5xl">{product.name}</h1>
            </HoverInfo>
            <ProductRatingBadge summary={ratingSummaries[product.id]} className="mb-3" />
            <p className="text-base text-muted-foreground">
              {tr("product.soldBy")} <span className="font-medium text-foreground">{sellerProfile?.full_name}</span>
            </p>
          </div>

          <div className="mb-8">
            <p className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent sm:text-5xl">
              {formatAmount(Number(product.price))}
            </p>
          </div>

          <div className="mb-5 sm:mb-8">
            <HoverInfo content={product.description}>
              <p
                className="text-base leading-relaxed text-muted-foreground sm:text-lg"
                style={{ display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
              >
                {product.description}
              </p>
            </HoverInfo>
          </div>

          {isFashionProduct && (sizeOptions.length > 0 || colorOptions.length > 0) && (
            <ProductVariantOptions
              sizeOptions={sizeOptions}
              colorOptions={colorOptions}
              sizeLabel={isElectronicsProduct ? "Model / Storage" : "Size"}
              sizeAttribute={isElectronicsProduct ? "model" : "size"}
            />
          )}

          <div className="mb-5 sm:mb-8">
            {product.stock > 0 ? (
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="border-green-500 text-green-500 px-3 py-1 text-sm">
                  ✓ {tr("product.inStock")}
                </Badge>
                <span className="text-sm text-muted-foreground font-medium">{product.stock} {tr("product.available")}</span>
              </div>
            ) : (
              <Badge variant="destructive" className="px-3 py-1 text-sm">
                {tr("product.outOfStock")}
              </Badge>
            )}
          </div>

          {sellerProfile && (
            <Card className="mb-6 rounded-xl border-border/70 shadow-sm sm:mb-8 sm:rounded-3xl">
              <CardContent className="space-y-4 p-4 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:text-sm sm:tracking-[0.18em]">
                  {tr("product.sellerDetails")}
                </p>
                <div className="space-y-4 text-sm text-slate-900 dark:text-slate-200">
                  <div>
                    <p className="font-semibold text-foreground">{sellerProfile.full_name}</p>
                    <p className="text-sm text-muted-foreground">{sellerProfile.role}</p>
                    <Link
                      href={`/store/${sellerProfile.id}`}
                      className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
                    >
                      <Store className="h-4 w-4" />
                      Visit {sellerProfile.full_name?.trim() || "seller"}&apos;s store
                    </Link>
                  </div>
                  {sellerProfile.email && (
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{tr("product.sellerEmail")}</p>
                      <p className="text-foreground">{sellerProfile.email}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{tr("product.sellerPhone")}</p>
                    {sellerProfile.phone?.trim() ? (
                      <a className="break-all text-foreground underline-offset-4 hover:underline" href={`tel:${sellerProfile.phone}`}>
                        {sellerProfile.phone}
                      </a>
                    ) : (
                      <p className="text-muted-foreground">Not provided</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="mb-10">
            {isSeller ? (
              <Button asChild size="lg" className="w-full shadow-lg shadow-primary/25">
                <Link href={`/seller/products/${product.id}/edit`}>
                  <Edit className="mr-2 h-5 w-5" />
                  {tr("product.editProduct")}
                </Link>
              </Button>
            ) : (
              <AddToCartButton product={product} />
            )}
          </div>

          <Card className="border-primary/10 bg-gradient-to-br from-card to-muted/20">
            <CardContent className="grid gap-4 p-4 sm:gap-6 sm:p-8 sm:grid-cols-3">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/60 shadow-lg shadow-primary/25 sm:h-12 sm:w-12">
                  <Truck className="h-5 w-5 text-primary-foreground sm:h-6 sm:w-6" />
                </div>
                <div>
                  <p className="font-semibold mb-1">{tr("product.fastDelivery")}</p>
                  <p className="text-sm text-muted-foreground">{tr("product.fastDeliveryDesc")}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/60 shadow-lg shadow-primary/25 sm:h-12 sm:w-12">
                  <Shield className="h-5 w-5 text-primary-foreground sm:h-6 sm:w-6" />
                </div>
                <div>
                  <p className="font-semibold mb-1">{tr("product.securePayment")}</p>
                  <p className="text-sm text-muted-foreground">{tr("product.securePaymentDesc")}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/60 shadow-lg shadow-primary/25 sm:h-12 sm:w-12">
                  <Package className="h-5 w-5 text-primary-foreground sm:h-6 sm:w-6" />
                </div>
                <div>
                  <p className="font-semibold mb-1">{tr("product.easyReturns")}</p>
                  <p className="text-sm text-muted-foreground">{tr("product.easyReturnsDesc")}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <ProductReviews productId={product.id} />
        </div>
      </div>
    </div>
    </ProductVariantProvider>
  )
}
