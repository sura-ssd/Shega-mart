import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { User, ShoppingBag, Settings, AlertCircle, Package, RotateCcw, Heart } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { getServerPlatformPreferences } from "@/lib/platform-preferences-server"
import { translate } from "@/lib/platform-preferences"

function AccountLoadingSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="animate-pulse">
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

async function AccountContent() {
  const supabase = await createClient()
  const preferences = await getServerPlatformPreferences()
  const tr = (key: Parameters<typeof translate>[1]) => translate(preferences.language, key)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  let profile = null
  let pendingOrders = null
  let purchaseHistory = null
  let error = null

  try {
    const [profileRes, pendingOrdersRes, purchaseHistoryRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .single(),
      supabase.rpc("get_customer_pending_orders", {
        p_customer_id: user.id,
      }),
      supabase.rpc("get_customer_purchase_history", {
        p_customer_id: user.id,
      }),
    ])

    if (profileRes.error) throw profileRes.error
    if (pendingOrdersRes.error) throw pendingOrdersRes.error
    if (purchaseHistoryRes.error) throw purchaseHistoryRes.error

    profile = profileRes.data
    pendingOrders = pendingOrdersRes.data
    purchaseHistory = purchaseHistoryRes.data
  } catch (e) {
    console.error("[v0] Error fetching account data:", e)
    error = e
  }

  const completedOrdersCount = purchaseHistory ? new Set(purchaseHistory.map((item: any) => item.order_id)).size : 0

  return (
    <>
      {error ? (
        <Alert variant="destructive" className="mb-8 animate-slide-up">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{tr("account.dbConnectionIssue")}</AlertTitle>
          <AlertDescription>
            {tr("account.dbConnectionIssueDesc")}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="animate-slide-up" style={{ animationDelay: "0s" }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {tr("account.profileInfo")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm text-muted-foreground">{tr("common.name")}</p>
              <p className="font-medium">{profile?.full_name || tr("account.notSet")}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{tr("account.emailLabel")}</p>
              <p className="font-medium">{user.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{tr("account.roleLabel")}</p>
              <p className="font-medium capitalize">{profile?.role}</p>
            </div>
            <Button variant="outline" className="w-full mt-4 bg-transparent" asChild>
              <Link href="/account/settings">
                <Settings className="mr-2 h-4 w-4" />
                {tr("account.editProfile")}
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              {tr("account.pendingOrders")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <p className="text-3xl font-bold">{pendingOrders?.length || 0}</p>
                <p className="text-sm text-muted-foreground">{tr("account.ordersInProgress")}</p>
              </div>
              <Button variant="outline" className="w-full mt-4 bg-transparent" asChild>
                <Link href="/account/orders">{tr("account.viewPendingOrders")}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-slide-up" style={{ animationDelay: "0.15s" }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {tr("account.purchaseHistory")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <p className="text-3xl font-bold">{completedOrdersCount}</p>
                <p className="text-sm text-muted-foreground">{tr("account.completedOrders")}</p>
              </div>
              <Button variant="outline" className="w-full mt-4 bg-transparent" asChild>
                <Link href="/account/purchase-history">{tr("account.viewPurchaseHistory")}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="animate-slide-up" style={{ animationDelay: "0.2s" }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              {tr("account.returnsTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">{tr("account.trackReturnRequests")}</p>
            <Button variant="outline" className="w-full bg-transparent" asChild>
              <Link href="/account/returns">{tr("account.viewReturns")}</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="animate-slide-up" style={{ animationDelay: "0.25s" }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5" />
              {tr("account.wishlist")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">{tr("account.productsSavedForLater")}</p>
            <Button variant="outline" className="w-full bg-transparent" asChild>
              <Link href="/account/wishlist">{tr("account.viewWishlist")}</Link>
            </Button>
          </CardContent>
        </Card>

        {profile?.role === "seller" && (
          <Card className="animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <CardHeader>
              <CardTitle>{tr("header.sellerDashboard")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">{tr("account.manageProductsAndSales")}</p>
              <Button className="w-full" asChild>
                <Link href="/seller">{tr("account.goToDashboard")}</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {profile?.role === "admin" && (
          <Card className="animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <CardHeader>
              <CardTitle>{tr("header.adminDashboard")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">{tr("account.manageEntirePlatform")}</p>
              <Button className="w-full" asChild>
                <Link href="/admin">{tr("account.goToDashboard")}</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  )
}

export default async function AccountPage() {
  const preferences = await getServerPlatformPreferences()
  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="mb-8 text-3xl font-bold tracking-tight animate-fade-in">{translate(preferences.language, "account.title")}</h1>
      <Suspense fallback={<AccountLoadingSkeleton />}>
        <AccountContent />
      </Suspense>
    </div>
  )
}
