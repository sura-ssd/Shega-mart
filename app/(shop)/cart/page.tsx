"use client"

import { useCart } from "@/hooks/use-cart"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import Image from "next/image"
import Link from "next/link"
import { Minus, Plus, Trash2, ShoppingBag, AlertTriangle } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { usePlatformPreferences } from "@/components/providers/platform-preferences-provider"

export default function CartPage() {
  const { items, removeItem, updateQuantity, getTotalPrice, getTotalItems, syncCartToDb } = useCart()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [stockLevels, setStockLevels] = useState<Record<string, number>>({})
  const [stockWarnings, setStockWarnings] = useState<Record<string, string>>({})
  const [user, setUser] = useState<{ id: string } | null>(null)
  const supabase = createClient()
  const { t, formatAmount } = usePlatformPreferences()

  useEffect(() => {
    setMounted(true)
    const getUser = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()
      setUser(authUser ? { id: authUser.id } : null)
    }
    getUser()
  }, [supabase])

  useEffect(() => {
    const fetchStockLevels = async () => {
      if (items.length === 0) return

      const supabase = createClient()
      // Query using base product IDs (strip variant suffixes)
      const productIds = Array.from(new Set(items.map((item) => (item.id || "").split("::")[0])))

      const { data, error } = await supabase.from("products").select("id, stock").in("id", productIds)

      if (error) {
        console.error("[v0] Error fetching stock levels:", error)
        return
      }

      if (data) {
        // Map product id -> stock
        const productStockMap: Record<string, number> = {}
        data.forEach((product) => {
          productStockMap[product.id] = product.stock
        })

        // Map per-cart-item stock/warnings keyed by the cart item id (which may include variant keys)
        const stockMap: Record<string, number> = {}
        const warnings: Record<string, string> = {}

        items.forEach((item) => {
          const baseId = (item.id || "").split("::")[0]
          const available = productStockMap[baseId]
          if (available !== undefined && available !== null) {
            stockMap[item.id] = available
            if (item.quantity > available) {
              warnings[item.id] =
                available === 0 ? t("cart.outOfStockNow") : t("cart.onlyAvailable", { count: available })
            }
          }
        })

        setStockLevels(stockMap)
        setStockWarnings(warnings)
      }
    }

    if (mounted) {
      fetchStockLevels()
    }
  }, [items, mounted])

  const handleCheckout = () => {
    const hasStockIssues = Object.keys(stockWarnings).length > 0
    if (hasStockIssues) {
      return
    }

    setIsLoading(true)
    router.push("/checkout")
  }

  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    const availableStock = stockLevels[itemId]
    if (availableStock !== undefined && newQuantity > availableStock) {
      return // Don't allow increasing beyond stock
    }
    updateQuantity(itemId, newQuantity)
  }

  const handleRemoveItem = async (itemId: string) => {
    removeItem(itemId)
    if (user) {
      await syncCartToDb(user.id)
    }
  }

  if (!mounted) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 flex min-h-[60vh] items-center justify-center py-8">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 flex min-h-[60vh] items-center justify-center py-8 animate-fade-in">
        <div className="text-center">
          <ShoppingBag className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
          <h2 className="mb-2 text-2xl font-bold">{t("cart.emptyTitle")}</h2>
          <p className="mb-6 text-muted-foreground">{t("cart.emptySubtitle")}</p>
          <Button asChild>
            <Link href="/">{t("cart.continueShopping")}</Link>
          </Button>
        </div>
      </div>
    )
  }

  const hasStockIssues = Object.keys(stockWarnings).length > 0

  return (
    <div className="mx-auto w-full max-w-7xl px-3 py-5 animate-fade-in sm:px-6 sm:py-8 lg:px-8">
      <h1 className="mb-5 text-2xl font-bold tracking-tight animate-slide-up sm:mb-8 sm:text-3xl">{t("cart.title")}</h1>

      {hasStockIssues && (
        <Alert variant="destructive" className="mb-6 animate-slide-down">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t("cart.stockIssuesTitle")}</AlertTitle>
          <AlertDescription>
            {t("cart.stockIssuesDesc")}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-3 lg:gap-8">
        <div className="lg:col-span-2">
          <Card className="animate-slide-in-left">
            <CardHeader>
              <CardTitle>{t("cart.itemsCount")} ({getTotalItems()})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item, index) => {
                const availableStock = stockLevels[item.id]
                const warning = stockWarnings[item.id]
                const isOutOfStock = availableStock === 0

                return (
                  <div key={item.id} className="space-y-2">
                    <div
                      className="flex gap-3 border-b pb-4 last:border-0 last:pb-0 animate-fade-in sm:gap-4"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border sm:h-24 sm:w-24">
                        <Image
                          src={item.image_url || `/placeholder.svg?height=100&width=100&query=${item.name}`}
                          alt={item.name}
                          fill
                          className="object-cover"
                        />
                        {isOutOfStock && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <span className="text-xs font-bold text-white">{t("cart.outOfStockBadge")}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col justify-between">
                        <div>
                          <Link
                            href={`/products/${(item.id || "").split("::")[0]}`}
                            className="break-words text-sm font-semibold hover:text-primary transition-colors sm:text-base"
                          >
                            {item.name}
                          </Link>
                          {(item.variant?.size || item.variant?.color || item.variant?.model) && (
                            <p className="text-xs text-muted-foreground">
                              {[item.variant.size && `Size: ${item.variant.size}`, item.variant.color && `Color: ${item.variant.color}`, item.variant.model && `Model: ${item.variant.model}`]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground">{formatAmount(item.price)} {t("cart.each")}</p>
                          {availableStock !== undefined && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {availableStock > 0 ? `${availableStock} ${t("products.inStock")}` : t("home.outOfStock")}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 bg-transparent hover:bg-primary/10 transition-colors"
                            onClick={() => handleQuantityChange(item.id, Math.max(1, item.quantity - 1))}
                            disabled={isOutOfStock}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 bg-transparent hover:bg-primary/10 transition-colors"
                            onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                            disabled={isOutOfStock || (availableStock !== undefined && item.quantity >= availableStock)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="ml-auto h-8 w-8 text-destructive hover:bg-destructive/10 transition-colors"
                            onClick={() => handleRemoveItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatAmount(item.price * item.quantity)}</p>
                      </div>
                    </div>
                    {warning && (
                      <Alert variant="destructive" className="animate-slide-down">
                        <AlertTriangle className="h-3 w-3" />
                        <AlertDescription className="text-xs">{warning}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="animate-slide-in-right lg:sticky lg:top-24">
            <CardHeader>
              <CardTitle>{t("cart.orderSummary")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("cart.subtotal")}</span>
                  <span className="font-medium">{formatAmount(getTotalPrice())}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("cart.shipping")}</span>
                  <span className="font-medium">{formatAmount(10)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("cart.tax")}</span>
                  <span className="font-medium">{formatAmount(getTotalPrice() * 0.1)}</span>
                </div>
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between">
                  <span className="font-semibold">{t("cart.total")}</span>
                  <span className="text-xl font-bold text-primary sm:text-2xl">
                    {formatAmount(getTotalPrice() + 10 + getTotalPrice() * 0.1)}
                  </span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full" size="lg" onClick={handleCheckout} disabled={isLoading || hasStockIssues}>
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    {t("cart.redirecting")}
                  </span>
                ) : hasStockIssues ? (
                  t("cart.resolveStockIssuesFirst")
                ) : (
                  t("cart.proceedToCheckout")
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}
