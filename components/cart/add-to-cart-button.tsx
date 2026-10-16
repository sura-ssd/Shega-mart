"use client"

import { Button } from "@/components/ui/button"
import { ShoppingCart } from "lucide-react"
import { useCart } from "@/hooks/use-cart"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import { usePlatformPreferences } from "@/components/providers/platform-preferences-provider"
import { CartVariant } from "@/hooks/use-cart"
import { useProductVariant } from "@/components/products/product-variant-provider"

interface AddToCartButtonProps {
  product: {
    id: string
    name: string
    price: number
    stock: number
    image_url?: string
  }
}

export function AddToCartButton({ product }: AddToCartButtonProps) {
  const { t } = usePlatformPreferences()
  const { addItem, items, syncCartToDb } = useCart()
  const { selectedVariant, selectedVariantStock, selectionReady } = useProductVariant()
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()
      setUser(authUser ? { id: authUser.id } : null)
    }
    getUser()
  }, [supabase])

  const handleAddToCart = async () => {
    if (!selectionReady) {
      toast.error("Choose each available variant before adding this product to your cart.")
      return
    }

    if (selectedVariantStock === null || selectedVariantStock <= 0) {
      toast.error("This variant is not in stock.")
      return
    }

    if (!user) {
      toast.error(t("addToCart.pleaseSignIn"), {
        description: t("addToCart.needLoginDesc"),
      })
      const nextPath = `${window.location.pathname}${window.location.search}`
      window.location.href = `/auth/login?next=${encodeURIComponent(nextPath)}`
      return
    }

    setLoading(true)
    try {
      const variantKey = `${product.id}::${selectedVariant.size || ""}::${selectedVariant.color || ""}::${selectedVariant.model || ""}`
      const existingItem = items.find((item) => item.id === variantKey)
      const currentQuantityInCart = existingItem ? existingItem.quantity : 0
      const newTotalQuantity = currentQuantityInCart + 1

      if (newTotalQuantity > selectedVariantStock) {
        toast.error(t("addToCart.cannotAddMore"), {
          description: t("addToCart.onlyUnitsAvailable", { stock: selectedVariantStock, inCart: currentQuantityInCart }),
        })
        return
      }

      addItem({
        id: variantKey,
        name: product.name,
        price: product.price,
        quantity: 1,
        image_url: selectedVariant.image_url || product.image_url,
        stock: product.stock,
        variant: selectedVariant as CartVariant,
      })

      if (user) {
        await syncCartToDb(user.id)
      }

      toast.success(t("addToCart.addedToCart"), {
        description: t("addToCart.itemAddedDesc", { name: product.name }),
      })
    } catch (error) {
      console.error("[v0] Error adding to cart:", error)
      toast.error(t("addToCart.failedToAdd"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      size="lg"
      className="w-full"
      disabled={product.stock === 0 || !selectionReady || selectedVariantStock === null || selectedVariantStock <= 0 || loading}
      onClick={handleAddToCart}
    >
      <ShoppingCart className="mr-2 h-5 w-5" />
      {product.stock > 0 && selectionReady && (selectedVariantStock ?? 0) > 0
        ? t("addToCart.addToCartBtn")
        : t("addToCart.outOfStock")}
    </Button>
  )
}
