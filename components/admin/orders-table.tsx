"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { usePlatformPreferences } from "@/components/providers/platform-preferences-provider"

function formatUtcDate(dateInput: string | null | undefined) {
  if (!dateInput) return "-"
  const date = new Date(dateInput)
  if (Number.isNaN(date.getTime())) return "-"

  const day = String(date.getUTCDate()).padStart(2, "0")
  const month = String(date.getUTCMonth() + 1).padStart(2, "0")
  const year = date.getUTCFullYear()
  return `${day}/${month}/${year}`
}

interface Order {
  id: string
  total_amount: number
  status: string
  created_at: string
  profiles: { full_name: string | null } | null
  order_items?: Array<{ seller_status: string | null }>
}

function getEffectiveOrderStatus(order: Order) {
  const baseStatus = (order.status || "pending").toLowerCase()

  // Preserve terminal/non-fulfillment states controlled directly on the order.
  if (["cancelled", "canceled", "expired", "delivered", "refunded"].includes(baseStatus)) {
    return baseStatus
  }

  const sellerStatuses = (order.order_items || [])
    .map((item) => (item.seller_status || "").toLowerCase())
    .filter(Boolean)

  if (sellerStatuses.length === 0) {
    return baseStatus
  }

  const allCompleted = sellerStatuses.every((status) => status === "completed")
  if (allCompleted) {
    return "completed"
  }

  const hasProcessing = sellerStatuses.some((status) => status === "processing")
  const hasCompleted = sellerStatuses.some((status) => status === "completed")
  if (hasProcessing || hasCompleted) {
    return "processing"
  }

  return "pending"
}

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case "completed":
    case "delivered":
      return "default"
    case "pending":
      return "secondary"
    default:
      return "outline"
  }
}

export function OrdersTable({ orders }: { orders: Order[] }) {
  const { t } = usePlatformPreferences()
  const statusLabels: Record<string, string> = {
    cancelled: t("admin.orderStatusCancelled"),
    canceled: t("admin.orderStatusCanceled"),
    expired: t("admin.orderStatusExpired"),
    delivered: t("admin.orderStatusDelivered"),
    refunded: t("admin.orderStatusRefunded"),
    completed: t("admin.orderStatusCompleted"),
    processing: t("admin.orderStatusProcessing"),
    pending: t("admin.orderStatusPending"),
  }
  if (orders.length === 0) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <p className="text-muted-foreground">{t("admin.noOrdersFound2")}</p>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("admin.colOrderId")}</TableHead>
          <TableHead>{t("admin.colCustomer")}</TableHead>
          <TableHead>{t("admin.colTotal")}</TableHead>
          <TableHead>{t("admin.colStatus")}</TableHead>
          <TableHead>{t("admin.colDate")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => {
          const effectiveStatus = getEffectiveOrderStatus(order)
          return (
          <TableRow key={order.id}>
            <TableCell className="font-mono text-sm">{order.id.slice(0, 8)}...</TableCell>
            <TableCell>{order.profiles?.full_name || t("admin.unknownCustomer")}</TableCell>
            <TableCell className="font-semibold">${Number(order.total_amount).toFixed(2)}</TableCell>
            <TableCell>
              <Badge variant={getStatusBadgeVariant(effectiveStatus)} className="capitalize">
                {statusLabels[effectiveStatus] || effectiveStatus}
              </Badge>
            </TableCell>
            <TableCell>{formatUtcDate(order.created_at)}</TableCell>
          </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
