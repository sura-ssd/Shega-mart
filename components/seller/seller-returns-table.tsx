"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useState } from "react"
import { usePlatformPreferences } from "@/components/providers/platform-preferences-provider"

interface Return {
  id: string
  order_id: string
  customer_id: string
  product_id: string
  reason: string
  status: string
  refund_amount: number
  requested_at: string
  description?: string
  profiles?: { full_name: string; email: string }
  products?: { name: string }
}

interface SellerReturnsTableProps {
  returns: Return[]
}

export function SellerReturnsTable({ returns: initialReturns }: SellerReturnsTableProps) {
  const { t } = usePlatformPreferences()
  const [processing, setProcessing] = useState<string | null>(null)
  const [displayedReturns, setDisplayedReturns] = useState<Return[]>(initialReturns)
  const returns = initialReturns; // Declare the returns variable

  const handleApprove = async (returnId: string) => {
    setProcessing(returnId)
    try {
      console.log("[v0] Approving return:", returnId)
      const res = await fetch("/api/returns/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: returnId }),
      })
      const data = await res.json()
      console.log("[v0] Approve response:", { status: res.status, data })
      if (res.ok) {
        // Update the return in the displayed list to show approved status
        setDisplayedReturns((prevReturns) =>
          prevReturns.map((ret) =>
            ret.id === returnId
              ? { ...ret, status: "approved" }
              : ret
          )
        )
      } else {
        console.error("[v0] Approve failed:", data)
      }
    } catch (error) {
      console.error("[v0] Error approving return:", error)
    }
    setProcessing(null)
  }

  const handleReject = async (returnId: string) => {
    setProcessing(returnId)
    try {
      console.log("[v0] Rejecting return:", returnId)
      const res = await fetch("/api/returns/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: returnId }),
      })
      const data = await res.json()
      console.log("[v0] Reject response:", { status: res.status, data })
      if (res.ok) {
        // Update the return in the displayed list to show rejected status
        setDisplayedReturns((prevReturns) =>
          prevReturns.map((ret) =>
            ret.id === returnId
              ? { ...ret, status: "rejected" }
              : ret
          )
        )
      } else {
        console.error("[v0] Reject failed:", data)
      }
    } catch (error) {
      console.error("[v0] Error rejecting return:", error)
    }
    setProcessing(null)
  }

  const statusLabels: Record<string, string> = {
    requested: t("seller.statusRequested"),
    approved: t("seller.statusApproved"),
    rejected: t("seller.statusRejected"),
    refunded: t("seller.statusRefunded"),
  }

  if (!displayedReturns || displayedReturns.length === 0) {
    return (
      <Card>
        <CardContent className="flex min-h-[200px] items-center justify-center">
          <p className="text-muted-foreground">{t("seller.noReturnsForProducts")}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {displayedReturns.map((returnItem) => (
        <Card key={returnItem.id}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base">{returnItem.products?.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{t("seller.customerLabel", { name: returnItem.profiles?.full_name || "" })}</p>
              </div>
              <Badge variant={returnItem.status === "requested" ? "outline" : "default"}>
                {statusLabels[returnItem.status] || returnItem.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("seller.reasonLabel")}</span>
                <span className="capitalize">{returnItem.reason}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("seller.refundAmountLabel")}</span>
                <span className="font-medium">${returnItem.refund_amount.toFixed(2)}</span>
              </div>
            </div>

            {returnItem.description && (
              <div className="text-sm p-3 rounded-lg bg-muted">
                <p className="font-medium mb-1">{t("seller.customerMessage")}</p>
                <p className="text-muted-foreground">{returnItem.description}</p>
              </div>
            )}

            {returnItem.status === "requested" && (
              <div className="flex gap-2 pt-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleApprove(returnItem.id)}
                  disabled={processing === returnItem.id}
                >
                  {processing === returnItem.id ? t("seller.processing") : t("seller.approve")}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleReject(returnItem.id)}
                  disabled={processing === returnItem.id}
                >
                  {processing === returnItem.id ? t("seller.processing") : t("seller.reject")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
