"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { RETURN_REASONS, RETURN_POLICIES } from "@/lib/return-reasons"
import { RotateCcw, Loader2 } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { usePlatformPreferences } from "@/components/providers/platform-preferences-provider"

interface ReturnDialogProps {
  orderId: string
  productId: string
  itemPrice: number
  productName: string
  deliveryDate: Date
}

export function ReturnDialog({ orderId, productId, itemPrice, productName, deliveryDate }: ReturnDialogProps) {
  const { t } = usePlatformPreferences()
  const reasonLabels: Record<string, string> = {
    damaged: t("returnReason.damaged"),
    not_as_described: t("returnReason.notAsDescribed"),
    wrong_item: t("returnReason.wrongItem"),
    size_fit: t("returnReason.sizeFit"),
    quality: t("returnReason.quality"),
    changed_mind: t("returnReason.changedMind"),
    other: t("returnReason.other"),
  }
  const policyDescriptions: Record<string, string> = {
    damaged: t("returnPolicy.damaged"),
    not_as_described: t("returnPolicy.notAsDescribed"),
    wrong_item: t("returnPolicy.wrongItem"),
    size_fit: t("returnPolicy.sizeFit"),
    quality: t("returnPolicy.quality"),
    changed_mind: t("returnPolicy.changedMind"),
    other: t("returnPolicy.other"),
  }
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    let isMounted = true
    
    const checkAuth = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (isMounted) {
          setIsAuthenticated(!!user)
          setIsCheckingAuth(false)
        }
      } catch (error) {
        // Auth check failed silently
        if (isMounted) {
          setIsAuthenticated(false)
          setIsCheckingAuth(false)
        }
      }
    }
    
    checkAuth()
    
    return () => {
      isMounted = false
    }
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return
      setIsAuthenticated(!!session?.user)
      setIsCheckingAuth(false)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [supabase])

  const daysSinceDelivery = Math.floor((Date.now() - deliveryDate.getTime()) / (1000 * 60 * 60 * 24))
  const selectedPolicy = RETURN_POLICIES[reason as keyof typeof RETURN_POLICIES]
  const isEligible = !selectedPolicy || daysSinceDelivery <= selectedPolicy.days
  const loginHref = `/auth/login?next=${encodeURIComponent(`${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`)}`

  const handleSubmit = async () => {
    if (!isAuthenticated) {
      toast.error(t("returnDialog.pleaseSignIn"), {
        description: t("returnDialog.needLoginDesc"),
      })
      router.push(loginHref)
      return
    }

    if (!reason) return

    setLoading(true)
    try {
      console.log("[v0] Submitting return request for order:", orderId, "product:", productId)
      const response = await fetch("/api/returns/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: orderId,
          product_id: productId,
          reason,
          description,
        }),
      })

      const data = await response.json()
      console.log("[v0] Return API response:", { status: response.status, data })

      if (!response.ok) {
        throw new Error(data.error || t("returnDialog.failedToCreate"))
      }

      console.log("[v0] Return created successfully:", data)

      setOpen(false)
      router.refresh()
      toast.success(t("returnDialog.submitted"), {
        description: t("returnDialog.submittedDesc"),
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t("returnDialog.failedToCreate")
      console.error("[v0] Error creating return:", errorMessage)
      toast.error(t("returnDialog.failedToCreate"), {
        description: errorMessage,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setOpen(false)
      return
    }

    if (isCheckingAuth) {
      toast.info(t("returnDialog.checkingSession"))
      return
    }

    if (!isAuthenticated) {
      toast.error(t("returnDialog.pleaseSignIn"), {
        description: t("returnDialog.needLoginDesc"),
      })
      router.push(loginHref)
      return
    }

    setOpen(true)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2 bg-transparent"
          disabled={isCheckingAuth}
        >
          <RotateCcw className="h-4 w-4" />
          {t("returnDialog.requestReturn")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("returnDialog.returnItem")}</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{productName}</span>
            <br />
            {t("returnDialog.refundAmount", { amount: `$${itemPrice.toFixed(2)}` })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Eligibility info */}
          <div className="text-sm p-3 rounded-lg bg-blue-50 text-blue-900 dark:bg-blue-900/20 dark:text-blue-200">
            <p className="font-medium mb-1">{t("returnDialog.returnWindow")}</p>
            <p>{t("returnDialog.daysSinceDelivery", { days: daysSinceDelivery })}</p>
          </div>

          {/* Reason selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("returnDialog.returnReason")}</label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder={t("returnDialog.selectReason")} />
              </SelectTrigger>
              <SelectContent>
                {RETURN_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {reasonLabels[r.value] || r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Policy info */}
          {selectedPolicy && (
            <div className="text-sm p-3 rounded-lg bg-muted">
              <p className="font-medium mb-1">{t("returnDialog.returnPolicy")}</p>
              <p className="text-muted-foreground">{policyDescriptions[reason] || selectedPolicy.description}</p>
              <p className="mt-2">
                {isEligible ? (
                  <span className="text-green-600 font-medium">✓ {t("returnDialog.eligibleForReturn")}</span>
                ) : (
                  <span className="text-red-600 font-medium">✗ {t("returnDialog.windowClosed", { days: selectedPolicy.days })}</span>
                )}
              </p>
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("returnDialog.descriptionOptional")}</label>
            <Textarea
              placeholder={t("returnDialog.descriptionPlaceholder")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-20"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("returnDialog.cancel")}
            </Button>
            <Button onClick={handleSubmit} disabled={!reason || loading || !isEligible} className="gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("returnDialog.requestReturn")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
