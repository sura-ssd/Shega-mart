"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CheckCircle2, ShieldAlert, XCircle } from "lucide-react"
import { formatPrice } from "@/lib/currency"
import { usePlatformPreferences } from "@/components/providers/platform-preferences-provider"

interface ModerationProduct {
  id: string
  name: string
  price: number
  stock: number
  moderation_status: "pending" | "approved" | "rejected"
  created_at: string
  seller: { full_name: string | null } | null
  categories: { name: string } | null
}

interface ModerationQueueTableProps {
  products: ModerationProduct[]
}

export function ModerationQueueTable({ products }: ModerationQueueTableProps) {
  const { t } = usePlatformPreferences()
  const [rows, setRows] = useState(products)
  const [query, setQuery] = useState("")
  const [processingId, setProcessingId] = useState<string | null>(null)

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((row) => {
      const seller = row.seller?.full_name || ""
      const category = row.categories?.name || ""
      return row.name.toLowerCase().includes(q) || seller.toLowerCase().includes(q) || category.toLowerCase().includes(q)
    })
  }, [query, rows])

  const handleModeration = async (id: string, action: "approve" | "reject") => {
    const notes = window.prompt(action === "approve" ? t("admin.approvalNotePrompt") : t("admin.rejectionReasonPrompt"))

    setProcessingId(id)
    try {
      const res = await fetch(`/api/admin/moderation/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, notes: notes || undefined }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.error || t("admin.moderationActionFailed"))
      }

      setRows((prev) => prev.filter((row) => row.id !== id))
      toast.success(action === "approve" ? t("admin.productApproved") : t("admin.productRejected"))
    } catch (error) {
      const message = error instanceof Error ? error.message : t("admin.actionFailed")
      toast.error(message)
    } finally {
      setProcessingId(null)
    }
  }

  if (rows.length === 0) {
    return (
      <div className="flex min-h-[220px] items-center justify-center rounded-lg border border-dashed">
        <div className="text-center">
          <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-500" />
          <p className="font-medium">{t("admin.queueClear")}</p>
          <p className="text-sm text-muted-foreground">{t("admin.queueClearDesc")}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Input
        placeholder={t("admin.searchModerationPlaceholder")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="space-y-3">
        {filteredRows.map((product) => (
          <div key={product.id} className="rounded-lg border bg-card p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{product.name}</h3>
                  <Badge variant={product.moderation_status === "rejected" ? "destructive" : "outline"}>
                    {product.moderation_status === "pending"
                      ? t("admin.orderStatusPending")
                      : product.moderation_status === "rejected"
                        ? t("admin.statusRejected")
                        : product.moderation_status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("admin.sellerCategoryLine", { seller: product.seller?.full_name || t("admin.unknownSeller"), category: product.categories?.name || t("admin.notApplicable") })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("admin.priceStockLine", { price: formatPrice(Number(product.price || 0)), stock: product.stock })}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="default"
                  disabled={processingId === product.id}
                  onClick={() => handleModeration(product.id, "approve")}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {t("admin.approve")}
                </Button>
                <Button
                  variant="destructive"
                  disabled={processingId === product.id}
                  onClick={() => handleModeration(product.id, "reject")}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  {t("admin.reject")}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredRows.length === 0 && (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          <ShieldAlert className="mx-auto mb-2 h-5 w-5" />
          {t("admin.noItemsMatchSearch")}
        </div>
      )}
    </div>
  )
}
