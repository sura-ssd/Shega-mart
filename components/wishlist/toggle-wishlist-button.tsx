"use client"

import { Heart } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { usePlatformPreferences } from "@/components/providers/platform-preferences-provider"

type ToggleWishlistButtonProps = {
  productId: string
  variant?: "ghost" | "outline"
  size?: "sm" | "icon"
  className?: string
}

export function ToggleWishlistButton({
  productId,
  variant = "ghost",
  size = "icon",
  className,
}: ToggleWishlistButtonProps) {
  const { t } = usePlatformPreferences()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [isInWishlist, setIsInWishlist] = useState(false)

  useEffect(() => {
    const loadWishlistState = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setIsInWishlist(false)
        return
      }

      const { data } = await supabase
        .from("wishlist_items")
        .select("id")
        .eq("user_id", user.id)
        .eq("product_id", productId)
        .maybeSingle()

      setIsInWishlist(!!data)
    }

    void loadWishlistState()
  }, [productId, supabase])

  const handleToggleWishlist = async () => {
    setLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        toast.error(t("wishlistBtn.pleaseSignIn"))
        return
      }

      if (isInWishlist) {
        const { error } = await supabase
          .from("wishlist_items")
          .delete()
          .eq("user_id", user.id)
          .eq("product_id", productId)

        if (error) throw error
        setIsInWishlist(false)
        toast.success(t("wishlistBtn.removed"))
      } else {
        const { error } = await supabase.from("wishlist_items").insert({
          user_id: user.id,
          product_id: productId,
        })

        if (error) throw error
        setIsInWishlist(true)
        toast.success(t("wishlistBtn.added"))
      }
    } catch (error) {
      console.error("[v0] Wishlist toggle failed:", error)
      toast.error(t("wishlistBtn.failedToUpdate"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      disabled={loading}
      onClick={handleToggleWishlist}
    >
      <Heart className={`h-4 w-4 ${isInWishlist ? "fill-red-500 text-red-500" : ""}`} />
      <span className="sr-only">{t("wishlistBtn.toggleSr")}</span>
    </Button>
  )
}
