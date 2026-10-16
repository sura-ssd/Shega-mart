import { Skeleton } from "@/components/ui/skeleton"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Package, AlertCircle, DollarSign, ShoppingCart } from "lucide-react"
import { AdminDashboardClient } from "@/components/admin/admin-dashboard-client"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { getServerPlatformPreferences } from "@/lib/platform-preferences-server"
import { translate } from "@/lib/platform-preferences"

function AdminLoadingSkeleton() {
  return (
    <>
      <div className="mb-8 grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="animate-pulse">
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </>
  )
}

function getEffectiveOrderStatus(order: any) {
  const baseStatus = String(order?.status || "pending").toLowerCase()

  if (["cancelled", "canceled", "expired", "delivered", "refunded"].includes(baseStatus)) {
    return baseStatus
  }

  const sellerStatuses = Array.isArray(order?.order_items)
    ? order.order_items
        .map((item: any) => String(item?.seller_status || "").toLowerCase())
        .filter(Boolean)
    : []

  if (sellerStatuses.length === 0) {
    return baseStatus
  }

  if (sellerStatuses.every((status: string) => status === "completed")) {
    return "completed"
  }

  if (sellerStatuses.some((status: string) => status === "processing" || status === "completed")) {
    return "processing"
  }

  return "pending"
}

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

async function AdminDashboard() {
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
  let users = null
  let products = null
  let categories = null
  let orders = null
  let returns = null
  let moderationQueue = null
  let error = null

  // Check if user is an admin first. Keep redirect out of broad try/catch.
  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profileError) {
    console.error("[v0] Error fetching admin profile:", getErrorDetails(profileError))
    error = profileError
  }

  if (!error && profileData?.role !== "admin") {
    redirect("/")
  }

  try {
    // Get all data for admin overview
    const { data: usersData, error: usersError } = await supabase.from("profiles").select("*")
    if (usersError) {
      console.error("[v0] Error fetching users:", getErrorDetails(usersError))
    }
    users = usersData || []

    const { data: productsData, error: productsError } = await supabase
      .from("products")
      .select("*, seller:profiles!products_seller_id_fkey(full_name), categories(name)")
    if (productsError) {
      console.error("[v0] Error fetching products:", getErrorDetails(productsError))
    }
    products = productsData || []

    // Use admin client to bypass RLS policies
    const adminClient = createAdminClient()

    const { data: moderationQueueData, error: moderationQueueError } = await adminClient
      .from("products")
      .select("id, name, price, stock, moderation_status, created_at, seller:profiles!products_seller_id_fkey(full_name), categories(name)")
      .in("moderation_status", ["pending", "rejected"])
      .order("created_at", { ascending: false })

    if (moderationQueueError) {
      console.error("[v0] Error fetching moderation queue:", getErrorDetails(moderationQueueError))
    } else {
      moderationQueue = moderationQueueData
    }

    const { data: categoriesData, error: categoriesError } = await supabase.from("categories").select("*")
    if (categoriesError) {
      console.error("[v0] Error fetching categories:", getErrorDetails(categoriesError))
    }
    categories = categoriesData || []

    // Fetch all orders with customer and product details
    const { data: ordersData, error: ordersError } = await adminClient
      .from("orders")
      .select(
        `
        id,
        customer_id,
        total_amount,
        status,
        created_at,
        profiles:customer_id(full_name, email),
        order_items(seller_status)
      `,
      )
      .order("created_at", { ascending: false })

    if (ordersError) {
      console.error("[v0] Error fetching orders:", getErrorDetails(ordersError))
    }
    orders = ordersData || []

    // Fetch all returns with customer and product details
    const { data: returnsData, error: returnsError } = await adminClient
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
        description,
        profiles:customer_id(full_name, email),
        products:product_id(name)
      `,
      )
      .order("requested_at", { ascending: false })

    if (returnsError) {
      console.error("[v0] Error fetching returns:", getErrorDetails(returnsError))
    } else {
      returns = returnsData
    }
    if (!returns) {
      returns = []
    }
    if (!moderationQueue) {
      moderationQueue = []
    }
  } catch (e) {
    console.error("[v0] Error fetching admin data:", getErrorDetails(e))
    error = e
  }

  // Calculate stats
  const totalUsers = users?.length || 0
  const totalProducts = products?.length || 0
  const totalCategories = categories?.length || 0
  const totalOrders = orders?.length || 0
  const totalRevenue = orders?.reduce((sum: number, order: any) => sum + Number(order.total_amount || 0), 0) || 0

  // Orders by status
  const ordersByStatus =
    orders?.reduce((acc: any, order: any) => {
      const status = getEffectiveOrderStatus(order)
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {}) || {}

  const statusChartData = Object.entries(ordersByStatus).map(([name, value]) => ({ name, value }))

  // Revenue over time (last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - i))
    return date.toISOString().split("T")[0]
  })

  const revenueByDay = last7Days.map((date) => {
    const dayOrders = orders?.filter((order: any) => order.created_at?.startsWith(date)) || []
    const revenue = dayOrders.reduce((sum: number, order: any) => sum + Number(order.total_amount || 0), 0)
    return {
      date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      revenue: Number(revenue.toFixed(2)),
    }
  })

  // Products by category
  const productsByCategory =
    products?.reduce((acc: any, product: any) => {
      const categoryName = product.categories?.name || "Uncategorized"
      acc[categoryName] = (acc[categoryName] || 0) + 1
      return acc
    }, {}) || {}

  const categoryChartData = Object.entries(productsByCategory).map(([name, value]) => ({ name, value }))

  // User roles distribution
  const usersByRole =
    users?.reduce((acc: any, user: any) => {
      const role = user.role || "customer"
      acc[role] = (acc[role] || 0) + 1
      return acc
    }, {}) || {}

  const roleChartData = Object.entries(usersByRole).map(([name, value]) => ({ name, value }))

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 animate-slide-up">
        <h1 className="text-3xl font-bold tracking-tight">{tr("admin.dashboard")}</h1>
        <p className="text-muted-foreground">{tr("admin.dashboardSubtitle")}</p>
      </div>

      {error ? (
        <Alert variant="destructive" className="mb-8 animate-slide-up">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{tr("admin.dbConnectionIssue")}</AlertTitle>
          <AlertDescription>
            {tr("admin.dbConnectionIssueDesc")}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="animate-slide-up border-l-4 border-l-blue-500" style={{ animationDelay: "0s" }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{tr("admin.totalRevenue")}</CardTitle>
            <DollarSign className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">{tr("admin.fromOrdersCount", { count: totalOrders })}</p>
          </CardContent>
        </Card>
        <Card className="animate-slide-up border-l-4 border-l-green-500" style={{ animationDelay: "0.1s" }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{tr("admin.totalOrders")}</CardTitle>
            <ShoppingCart className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalOrders}</div>
            <p className="text-xs text-muted-foreground mt-1">{tr("admin.allTimeOrders")}</p>
          </CardContent>
        </Card>
        <Card className="animate-slide-up border-l-4 border-l-purple-500" style={{ animationDelay: "0.2s" }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{tr("admin.totalProducts")}</CardTitle>
            <Package className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalProducts}</div>
            <p className="text-xs text-muted-foreground mt-1">{tr("admin.listedItems")}</p>
          </CardContent>
        </Card>
        <Card className="animate-slide-up border-l-4 border-l-orange-500" style={{ animationDelay: "0.3s" }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{tr("admin.totalUsers")}</CardTitle>
            <Users className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">{tr("admin.registeredAccounts")}</p>
          </CardContent>
        </Card>
      </div>

      <AdminDashboardClient
        revenueByDay={revenueByDay}
        statusChartData={statusChartData}
        categoryChartData={categoryChartData}
        roleChartData={roleChartData}
        users={users}
        products={products}
        categories={categories}
        orders={orders}
        returns={returns}
        moderationQueue={moderationQueue}
      />
    </div>
  )
}

export default AdminDashboard
