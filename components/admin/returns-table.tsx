"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, XCircle, Clock } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
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

interface ReturnsTableProps {
  returns: Return[]
}

export function ReturnsTable({ returns }: ReturnsTableProps) {
  const { t } = usePlatformPreferences()
  const [processing, setProcessing] = useState<string | null>(null)
  const statusLabels: Record<string, string> = {
    requested: t("admin.statusRequested"),
    approved: t("admin.statusApproved"),
    rejected: t("admin.statusRejected"),
    refunded: t("admin.statusRefunded"),
  }

  const handleApprove = async (returnId: string) => {
    setProcessing(returnId)
    try {
      const res = await fetch("/api/returns/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: returnId, status: "approved" }),
      })
      if (res.ok) {
        window.location.reload()
      }
    } catch (error) {
      console.error("[v0] Error approving return:", error)
    }
    setProcessing(null)
  }

  const handleReject = async (returnId: string) => {
    setProcessing(returnId)
    try {
      const res = await fetch("/api/returns/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: returnId, status: "rejected" }),
      })
      if (res.ok) {
        window.location.reload()
      }
    } catch (error) {
      console.error("[v0] Error rejecting return:", error)
    }
    setProcessing(null)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "requested":
        return <Clock className="h-4 w-4" />
      case "approved":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "rejected":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "refunded":
        return <CheckCircle className="h-4 w-4 text-blue-500" />
      default:
        return null
    }
  }

  if (!returns || returns.length === 0) {
    return (
      <Card>
        <CardContent className="flex min-h-[200px] items-center justify-center">
          <p className="text-muted-foreground">{t("admin.noReturnRequestsFound")}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {returns.map((returnItem) => (
        <Card key={returnItem.id}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base">{returnItem.products?.name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t("admin.customerLabel", { name: returnItem.profiles?.full_name || "", email: returnItem.profiles?.email || "" })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(returnItem.status)}
                <Badge variant={returnItem.status === "requested" ? "outline" : "default"}>
                  {statusLabels[returnItem.status] || returnItem.status}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("admin.reasonLabel")}</span>
                <span className="capitalize">{returnItem.reason}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("admin.requestedLabel")}</span>
                <span>
                  {formatDistanceToNow(new Date(returnItem.requested_at), {
                    addSuffix: true,
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("admin.refundAmountLabel")}</span>
                <span className="font-medium">${returnItem.refund_amount.toFixed(2)}</span>
              </div>
            </div>

            {returnItem.description && (
              <div className="text-sm p-3 rounded-lg bg-muted">
                <p className="font-medium mb-1">{t("admin.customerDescriptionLabel")}</p>
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
                  {processing === returnItem.id ? t("admin.processing") : t("admin.approve")}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleReject(returnItem.id)}
                  disabled={processing === returnItem.id}
                >
                  {processing === returnItem.id ? t("admin.processing") : t("admin.reject")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
