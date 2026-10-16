import { createClient } from "@/lib/supabase/server"
import { Card, CardContent } from "@/components/ui/card"
import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { formatPriceForCurrency } from "@/lib/currency"
import { getServerPlatformPreferences } from "@/lib/platform-preferences-server"
import { translate } from "@/lib/platform-preferences"
import { ProductRatingBadge } from "@/components/products/product-rating-badge"
import { getProductRatingSummaries } from "@/lib/product-ratings"

function ProductsLoadingSkeleton() {
  return (
    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <Card key={i} className="animate-pulse">
          <Skeleton className="aspect-square w-full" />
          <CardContent className="p-5 space-y-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-8 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

async function CategoryContent({ slug }: { slug: string }) {
  const supabase = await createClient()
  const preferences = await getServerPlatformPreferences()
  const tr = (key: Parameters<typeof translate>[1]) => translate(preferences.language, key)
  const formatAmount = (value: number) =>
    formatPriceForCurrency(value, {
      currency: preferences.currency,
      locale: preferences.locale,
      rates: preferences.rates,
    })

  const decodedSlug = decodeURIComponent(slug)
  console.log("[v0] Category slug:", { original: slug, decoded: decodedSlug })

  const [{ data: authData }, categoryRes] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("categories")
      .select("id, name, description")
      .eq("slug", decodedSlug)
      .maybeSingle(),
  ])

  const authUser = authData.user
  let userProfile = null
  if (authUser) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", authUser.id)
      .single()
    userProfile = profile
  }

  let category = null
  let products = null
  let error = null

  try {
    if (categoryRes.error) throw categoryRes.error
    category = categoryRes.data

    if (!category) {
      notFound()
    }

    const { data: productsData, error: productsError } = await supabase
      .from("products")
      .select("id, name, description, image_url, price, stock")
      .eq("category_id", category.id)
      .eq("is_active", true)

    if (productsError) throw productsError
    products = productsData
  } catch (e) {
    console.error("[v0] Error fetching category or products:", e)
    error = e
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mx-auto max-w-2xl">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Database Connection Issue</AlertTitle>
        <AlertDescription>
          Unable to load this category. Please make sure the database is set up by running the SQL scripts. If you've
          already done this, the database may be starting up.
        </AlertDescription>
      </Alert>
    )
  }

  if (!category) {
    notFound()
  }

  const ratingSummaries = await getProductRatingSummaries(supabase, (products || []).map((product) => product.id))

  const isSeller = userProfile?.role === "seller"
  if (isSeller) {
    return (
      <Alert className="mx-auto max-w-2xl animate-fade-in">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Seller Access</AlertTitle>
        <AlertDescription>
          As a seller, you can browse your products in the Seller Dashboard. Visit your dashboard to manage your
          inventory.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <>
      <div className="mb-8 rounded-xl border border-primary/10 bg-gradient-to-br from-primary/10 via-primary/5 to-background p-5 animate-slide-up sm:mb-16 sm:rounded-2xl sm:p-12">
        <h1 className="mb-2 text-3xl font-bold tracking-tight sm:mb-4 sm:text-5xl">{category.name}</h1>
        <p className="max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-xl">{category.description}</p>
      </div>

      {products && products.length > 0 ? (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product, index) => (
            <Link
              key={product.id}
              href={`/products/${product.id}`}
              className="group animate-scale-in"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <Card className="h-full overflow-hidden border-primary/10 transition-all duration-300 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-2">
                <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                  <Image
                    src={product.image_url || `/placeholder.svg?height=400&width=400&query=${product.name}`}
                    alt={product.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  {product.stock === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                      <span className="text-xs font-semibold text-white sm:text-lg">{tr("product.outOfStock")}</span>
                    </div>
                  )}
                </div>
                <CardContent className="p-2.5 sm:p-5">
                  <h3 className="mb-1 line-clamp-1 text-sm font-semibold transition-colors group-hover:text-primary sm:mb-2 sm:text-lg">
                    {product.name}
                  </h3>
                  <ProductRatingBadge summary={ratingSummaries[product.id]} className="mb-2 text-xs" />
                  <p className="mb-2 line-clamp-2 text-[11px] leading-snug text-muted-foreground sm:mb-3 sm:text-sm sm:leading-relaxed">
                    {product.description}
                  </p>
                  <div className="flex items-baseline justify-between">
                    <p className="text-sm font-bold text-primary sm:text-2xl">{formatAmount(Number(product.price))}</p>
                    <p className="text-[10px] text-muted-foreground sm:text-xs">
                      {product.stock > 0 ? `${product.stock} ${tr("products.inStock")}` : tr("home.outOfStock")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex min-h-[400px] items-center justify-center rounded-2xl border-2 border-dashed border-muted-foreground/20 animate-fade-in">
          <div className="text-center p-8">
            <p className="mb-2 text-2xl font-medium">{tr("home.noProductsTitle")}</p>
            <p className="text-lg text-muted-foreground">{tr("home.noProductsSubtitle")}</p>
          </div>
        </div>
      )}
    </>
  )
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <Suspense fallback={<ProductsLoadingSkeleton />}>
        <CategoryContent slug={slug} />
      </Suspense>
    </div>
  )
}
