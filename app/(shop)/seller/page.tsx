import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Package, Plus, DollarSign, TrendingUp, AlertCircle, History, RotateCcw, BarChart3, Boxes } from "lucide-react"
import { ProductsTable } from "@/components/seller/products-table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { SellerReturnsTable } from "@/components/seller/seller-returns-table"
import { formatPrice } from "@/lib/currency"
import { getServerPlatformPreferences } from "@/lib/platform-preferences-server"
import { translate } from "@/lib/platform-preferences"

function SellerLoadingSkeleton() {
  return (
    <>
      <div className="mb-8 grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="animate-pulse">
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </>
  )
}

async function SellerDashboardContent() {
  const supabase = await createClient()
  const preferences = await getServerPlatformPreferences()
  const tr = (key: Parameters<typeof translate>[1], vars?: Record<string, string | number>) => translate(preferences.language, key, vars)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  let profile = null
  let products = null
  let sellerReturns = null
  let sellerOrderItems: any[] = []
  let error = null

  try {
    // Check if user is a seller or admin
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profileError) throw profileError
    profile = profileData

    if (profile?.role !== "seller" && profile?.role !== "admin") {
      redirect("/")
    }

    // Get seller's products
    const { data: productsData, error: productsError } = await supabase
      .from("products")
      .select("*, categories(name)")
      .eq("seller_id", user.id)

    if (productsError) throw productsError
    products = productsData

    if (products && products.length > 0) {
      const productIds = products.map((p) => p.id)
      console.log("[v0] Seller product IDs:", productIds)

      // Fetch returns for these products - use admin client to bypass RLS
      const adminClient = createAdminClient()

      const { data: returns, error: returnsError } = await adminClient
        .from("returns")
        .select(
          `
          id,
          order_id,
          customer_id,
          product_id,
          reason,
          status,
          refund_amount,
          requested_at,
          description
        `,
        )
        .in("product_id", productIds)
        .order("requested_at", { ascending: false })

      if (returnsError) {
        console.error("[v0] Error fetching returns:", returnsError)
        throw returnsError
      }

      const { data: sellerItems, error: sellerItemsError } = await adminClient
        .from("order_items")
        .select("product_id, quantity, price, seller_status, created_at")
        .in("product_id", productIds)

      if (sellerItemsError) {
        console.error("[v0] Error fetching seller order items:", sellerItemsError)
      } else {
        sellerOrderItems = sellerItems || []
      }

      // Fetch customer and product details separately
      if (returns && returns.length > 0) {
        const customerIds = [...new Set(returns.map((r) => r.customer_id))]
        const { data: customers } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", customerIds)

        const { data: productsData } = await supabase
          .from("products")
          .select("id, name, seller_id")
          .in("id", productIds)

        // Merge the data
        sellerReturns = returns.map((ret) => ({
          ...ret,
          profiles: customers?.find((c) => c.id === ret.customer_id) || null,
          products: productsData?.find((p) => p.id === ret.product_id) || null,
        }))
        console.log("[v0] Final seller returns with merged data:", sellerReturns)
      } else {
        sellerReturns = []
      }
    } else {
      console.log("[v0] Seller has no products")
    }
  } catch (e) {
    console.error("[v0] Error fetching seller data:", e)
    error = e
  }

  // Calculate stats
  const totalProducts = products?.length || 0
  const activeProducts = products?.filter((p) => p.is_active).length || 0
  const totalValue = products?.reduce((sum, p) => sum + Number(p.price) * p.stock, 0) || 0
  const lowStockProducts =
    products?.filter((p) => Number(p.stock || 0) <= Number(p.low_stock_threshold ?? 5)) || []

  const completedItems = sellerOrderItems.filter((item) => item.seller_status === "completed")
  const totalUnitsSold = completedItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
  const grossSales = completedItems.reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.price || 0),
    0,
  )
  const returnRate = totalUnitsSold > 0 ? ((sellerReturns?.length || 0) / totalUnitsSold) * 100 : 0

  return (
    <>
      {error ? (
        <Alert variant="destructive" className="mb-8 animate-slide-up">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{tr("seller.dbConnectionIssue")}</AlertTitle>
          <AlertDescription>
            {tr("seller.dbConnectionIssueDesc")}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="animate-slide-up" style={{ animationDelay: "0s" }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{tr("seller.totalProducts")}</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProducts}</div>
            <p className="text-xs text-muted-foreground">{tr("seller.activeCount", { count: activeProducts })}</p>
          </CardContent>
        </Card>
        <Card className="animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{tr("seller.inventoryValue")}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(totalValue)}</div>
            <p className="text-xs text-muted-foreground">{tr("seller.totalStockValue")}</p>
          </CardContent>
        </Card>
        <Card className="animate-slide-up" style={{ animationDelay: "0.2s" }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{tr("seller.performance")}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalProducts > 0 ? ((activeProducts / totalProducts) * 100).toFixed(0) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">{tr("seller.activeRate")}</p>
          </CardContent>
        </Card>
        <Card className="animate-slide-up" style={{ animationDelay: "0.3s" }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{tr("seller.lowStockAlerts")}</CardTitle>
            <Boxes className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowStockProducts.length}</div>
            <p className="text-xs text-muted-foreground">{tr("seller.productsAtOrBelowThreshold")}</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-8">
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              {tr("seller.sellerAnalytics")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">{tr("seller.unitsSold")}</p>
                <p className="text-2xl font-bold">{totalUnitsSold}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">{tr("seller.grossSales")}</p>
                <p className="text-2xl font-bold">{formatPrice(grossSales)}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">{tr("seller.returnRate")}</p>
                <p className="text-2xl font-bold">{returnRate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              {tr("seller.inventoryAlerts")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStockProducts.length > 0 ? (
              <div className="space-y-2">
                {lowStockProducts.slice(0, 6).map((product) => (
                  <div key={product.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                    <span className="font-medium">{product.name}</span>
                    {Number(product.stock || 0) <= 0 ? (
                      <span className="font-medium text-destructive">{tr("seller.itemEndedOutOfStock")}</span>
                    ) : (
                      <span className="text-muted-foreground">
                        {tr("seller.stockAlertAt", { stock: product.stock, threshold: product.low_stock_threshold ?? 5 })}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{tr("seller.allProductsAboveThreshold")}</p>
            )}
          </CardContent>
        </Card>

        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle>{tr("seller.yourProducts")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ProductsTable products={products || []} />
          </CardContent>
        </Card>

        <Card className="animate-fade-in">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-primary" />
                {tr("seller.returnRequests")}
              </CardTitle>
              {sellerReturns && sellerReturns.filter((r) => r.status === "requested").length > 0 && (
                <span className="text-sm font-medium bg-accent/20 text-accent px-3 py-1 rounded-full">
                  {tr("seller.pendingCount", { count: sellerReturns.filter((r) => r.status === "requested").length })}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {sellerReturns && sellerReturns.length > 0 ? (
              <SellerReturnsTable returns={sellerReturns} />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <RotateCcw className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="font-medium text-foreground mb-1">{tr("seller.noReturnRequestsTitle")}</p>
                <p className="text-sm text-muted-foreground">
                  {tr("seller.noReturnRequestsSubtitle")}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}

export default async function SellerDashboard() {
  const preferences = await getServerPlatformPreferences()
  const tr = (key: Parameters<typeof translate>[1]) => translate(preferences.language, key)
  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex items-center justify-between animate-slide-up">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{tr("seller.dashboard")}</h1>
          <p className="text-muted-foreground">{tr("seller.dashboardSubtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="lg">
            <Link href="/seller/orders">
              <Package className="mr-2 h-5 w-5" />
              {tr("seller.pendingOrders")}
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/seller/sold-items">
              <History className="mr-2 h-5 w-5" />
              {tr("seller.salesHistory")}
            </Link>
          </Button>
          <Button asChild size="lg">
            <Link href="/seller/products/new">
              <Plus className="mr-2 h-5 w-5" />
              {tr("seller.addProduct")}
            </Link>
          </Button>
        </div>
      </div>

      <Suspense fallback={<SellerLoadingSkeleton />}>
        <SellerDashboardContent />
      </Suspense>
    </div>
  )
}
