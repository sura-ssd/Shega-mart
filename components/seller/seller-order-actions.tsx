"use client"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ChevronDown, Loader2 } from "lucide-react"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { usePlatformPreferences } from "@/components/providers/platform-preferences-provider"

type SellerStatus = "pending" | "processing" | "completed"

export function SellerOrderActions({
  itemId,
  currentStatus,
  orderId,
  customerId,
  productId,
  productName,
}: {
  itemId: string
  currentStatus: SellerStatus
  orderId: string
  customerId: string
  productId: string
  productName: string
}) {
  const { t } = usePlatformPreferences()
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const handleStatusChange = async (newStatus: SellerStatus) => {
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc("update_seller_status", {
        p_item_id: itemId,
        p_new_status: newStatus,
      })

      if (error) throw error

      if (newStatus === "completed") {
        const { data: updatedProduct } = await supabase
          .from("products")
          .select("stock, low_stock_threshold")
          .eq("id", productId)
          .single()

        const stockValue = Number(updatedProduct?.stock ?? 0)
        const threshold = Number(updatedProduct?.low_stock_threshold ?? 5)

        if (stockValue <= threshold) {
          await fetch("/api/notifications/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "low_stock_alert",
              productName,
              lowStockValue: stockValue,
              threshold,
            }),
          })
        }

        const notifRes = await fetch("/api/notifications/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "order_delivered",
            orderId,
            customerId,
            productName,
          }),
        })

        if (!notifRes.ok) {
          const notifErr = await notifRes.text()
          console.error("[v0] Failed to create order delivered notification:", notifErr)
        }
      }

      toast.success(t("seller.statusUpdatedTo", { status: newStatus }))

      if (newStatus === "completed") {
        setTimeout(() => {
          router.push("/seller/sold-items")
          router.refresh()
        }, 500)
      } else {
        setTimeout(() => {
          router.refresh()
        }, 500)
      }
    } catch (error) {
      console.error("[v0] Error updating status:", error)
      toast.error(t("seller.failedToUpdateStatus"))
    } finally {
      setLoading(false)
    }
  }

  const statuses: SellerStatus[] = ["pending", "processing", "completed"]
  const availableStatuses = statuses.filter((s) => s !== currentStatus)
  const statusLabels: Record<SellerStatus, string> = {
    pending: t("seller.orderStatusPending"),
    processing: t("seller.orderStatusProcessing"),
    completed: t("seller.orderStatusCompleted"),
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" disabled={loading} className="gap-1">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          <span className="sr-only">{t("seller.actionsSr")}</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {availableStatuses.map((status) => (
          <DropdownMenuItem
            key={status}
            onClick={() => handleStatusChange(status)}
            className="capitalize cursor-pointer"
          >
            {statusLabels[status]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
