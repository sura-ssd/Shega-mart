import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Package, CheckCircle, Clock, Truck } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { SellerOrderActions } from "@/components/seller/seller-order-actions"
import { formatPrice } from "@/lib/currency"
import { getServerPlatformPreferences } from "@/lib/platform-preferences-server"
import { translate } from "@/lib/platform-preferences"

type SellerItemStatus = "pending" | "processing" | "completed"

type SellerOrderItem = {
  id: string
  quantity: number
  price: number
  seller_status: SellerItemStatus
  variant_size?: string | null
  variant_color?: string | null
  variant_model?: string | null
  variant_image_url?: string | null
  products: {
    id: string
    name: string
    image_url: string | null
  }
}

type SellerOrder = {
  id: string
  customer_id: string
  total_amount: number
  status: string
  created_at: string
  customer_name: string
  customer_email: string
  items: SellerOrderItem[]
}

function getEffectiveSellerOrderStatus(order: SellerOrder): "pending" | "processing" | "completed" {
  const statuses = order.items.map((item) => item.seller_status)

  if (statuses.length === 0) {
    return "pending"
  }

  if (statuses.every((status) => status === "completed")) {
    return "completed"
  }

  if (statuses.some((status) => status === "processing" || status === "completed")) {
    return "processing"
  }

  return "pending"
}

function getOrderBadgeClass(status: "pending" | "processing" | "completed") {
  switch (status) {
    case "completed":
      return "bg-green-500/10 text-green-700 border border-green-200"
    case "processing":
      return "bg-blue-500/10 text-blue-700 border border-blue-200"
    default:
      return "bg-yellow-500/10 text-yellow-700 border border-yellow-200"
  }
}

export default async function SellerOrdersPage() {
  const supabase = await createClient()
  const preferences = await getServerPlatformPreferences()
  const tr = (key: Parameters<typeof translate>[1], vars?: Record<string, string | number>) => translate(preferences.language, key, vars)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  let orders: SellerOrder[] = []
  let error = null

  try {
    // Check if user is a seller
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profileError) throw profileError

    if (profileData?.role !== "seller") {
      redirect("/")
    }

    const { data: orderData, error: ordersError } = await supabase.rpc("get_seller_orders", {
      p_seller_id: user.id,
    })

    if (ordersError) throw ordersError

    // Group the results by order ID, excluding completed items
    const groupedOrders = (orderData || []).reduce(
      (acc: Record<string, SellerOrder>, row: any) => {
        // Skip completed items
        if (row.seller_status === "completed") {
          return acc
        }

        const orderId = row.order_id
        if (!acc[orderId]) {
          acc[orderId] = {
            id: row.order_id,
            customer_id: row.customer_id,
            total_amount: row.total_amount,
            status: row.status,
            created_at: row.created_at,
            customer_name: row.customer_name,
            customer_email: row.customer_email,
            items: [],
          }
        }
        const sellerStatus: SellerItemStatus =
          row.seller_status === "processing" || row.seller_status === "completed"
            ? row.seller_status
            : "pending"

        acc[orderId].items.push({
          id: row.item_id,
          quantity: row.quantity,
          price: row.price,
          seller_status: sellerStatus,
          products: {
            id: row.product_id,
            name: row.product_name,
            image_url: row.product_image_url,
          },
          variant_size: row.variant_size,
          variant_color: row.variant_color,
          variant_model: row.variant_model,
          variant_image_url: row.variant_image_url,
        })
        return acc
      },
      {} as Record<string, SellerOrder>,
    )

    orders = (Object.values(groupedOrders) as SellerOrder[]).filter((order) => order.items.length > 0)
  } catch (e) {
    console.error("[v0] Error fetching seller orders:", e)
    error = e
  }

  const orderStatusLabels: Record<string, string> = {
    pending: tr("seller.orderStatusPending"),
    processing: tr("seller.orderStatusProcessing"),
    completed: tr("seller.orderStatusCompleted"),
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "processing":
        return <Truck className="h-4 w-4 text-blue-500" />
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500/10 text-green-700 border-green-200"
      case "processing":
        return "bg-blue-500/10 text-blue-700 border-blue-200"
      default:
        return "bg-yellow-500/10 text-yellow-700 border-yellow-200"
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <div className="mb-8 animate-slide-up">
        <h1 className="text-3xl font-bold tracking-tight">{tr("seller.ordersTitle")}</h1>
        <p className="text-muted-foreground">{tr("seller.ordersSubtitle")}</p>
      </div>

      {error ? (
        <Alert variant="destructive" className="mb-8">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{tr("seller.errorLoadingOrders")}</AlertTitle>
          <AlertDescription>{tr("seller.errorLoadingOrdersDesc")}</AlertDescription>
        </Alert>
      ) : null}

      {orders && orders.length === 0 ? (
        <Card className="animate-slide-in-left">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">{tr("seller.noPendingOrdersTitle")}</p>
            <p className="text-muted-foreground">{tr("seller.noPendingOrdersSubtitle")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders?.map((order: SellerOrder, index) => {
            const effectiveStatus = getEffectiveSellerOrderStatus(order)

            return (
              <Card
                key={order.id}
                className="overflow-hidden animate-slide-in-left hover:shadow-lg transition-shadow"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardHeader className="pb-3 bg-muted/30">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg">{tr("seller.orderNumber")}{order.id.slice(0, 8)}</CardTitle>
                      <p className="text-sm text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <Badge className={`capitalize ${getOrderBadgeClass(effectiveStatus)}`}>{orderStatusLabels[effectiveStatus] || effectiveStatus}</Badge>
                      <p className="text-sm font-semibold mt-2">{formatPrice(Number(order.total_amount))}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="grid gap-2 text-sm bg-card/50 p-3 rounded-lg">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{tr("seller.customerColon")}</span>
                      <span className="font-medium">{order.customer_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{tr("seller.emailColon")}</span>
                      <span className="font-medium">{order.customer_email}</span>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      {tr("seller.itemsForFulfillment")}
                    </h4>
                    <div className="space-y-3">
                      {order.items.map((item: SellerOrderItem) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            {(item.variant_image_url || item.products.image_url) && (
                              <img
                                src={item.variant_image_url || item.products.image_url || "/placeholder.svg"}
                                alt={item.products.name}
                                className="h-12 w-12 rounded object-cover border"
                              />
                            )}
                            <div className="flex-1">
                              <p className="font-medium">{item.products.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {[item.variant_size && `Size: ${item.variant_size}`, item.variant_color && `Color: ${item.variant_color}`, item.variant_model && `Model: ${item.variant_model}`]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {tr("seller.quantityTimesPrice", { quantity: item.quantity, price: formatPrice(Number(item.price)) })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={getStatusColor(item.seller_status)}>
                              {getStatusIcon(item.seller_status)}
                              <span className="ml-1 capitalize">{orderStatusLabels[item.seller_status] || item.seller_status}</span>
                            </Badge>
                            <SellerOrderActions
                              itemId={item.id}
                              currentStatus={item.seller_status}
                              orderId={order.id}
                              customerId={order.customer_id}
                              productId={item.products.id}
                              productName={item.products.name}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">{tr("seller.updateStatusHint")}</p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
