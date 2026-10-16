"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import { createBrowserClient } from "@supabase/ssr"

export interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  image_url?: string
  stock?: number
  variant?: CartVariant
}

export interface CartVariant {
  size?: string | null
  color?: string | null
  model?: string | null
  image_url?: string | null
}

interface CartStore {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  getTotalPrice: () => number
  getTotalItems: () => number
  loadUserCart: (userId: string) => Promise<void>
  syncCartToDb: (userId: string) => Promise<void>
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) =>
        set((state) => {
          const existingItem = state.items.find((i) => i.id === item.id)
          if (existingItem) {
            return {
              items: state.items.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i)),
            }
          }
          return { items: [...state.items, item] }
        }),
      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((i) => i.id !== id),
        })),
      updateQuantity: (id, quantity) =>
        set((state) => ({
          items: state.items.map((i) => (i.id === id ? { ...i, quantity } : i)),
        })),
      clearCart: () => set({ items: [] }),
      getTotalPrice: () => {
        const { items } = get()
        return items.reduce((total, item) => total + item.price * item.quantity, 0)
      },
      getTotalItems: () => {
        const { items } = get()
        return items.reduce((total, item) => total + item.quantity, 0)
      },
      loadUserCart: async (userId: string) => {
        // Try to load with variant columns first; if the DB doesn't yet have them, fall back.
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL || "",
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
        )

        const tryQuery = async (includeVariants = true) => {
          const selectFields = includeVariants
            ? `
              id,
              product_id,
              quantity,
              variant_size,
              variant_color,
              variant_model,
              variant_image_url,
              products:product_id (
                id,
                name,
                price,
                image_url,
                stock
              )
            `
            : `
              id,
              product_id,
              quantity,
              products:product_id (
                id,
                name,
                price,
                image_url,
                stock
              )
            `

          const { data: cartItems, error } = await supabase.from("cart_items").select(selectFields).eq("user_id", userId)
          return { cartItems, error }
        }

        try {
          let { cartItems, error } = await tryQuery(true)
          if (error && (error as any).code === '42703') {
            // column does not exist -> fallback to older schema
            const res = await tryQuery(false)
            cartItems = res.cartItems
            error = res.error
          }

          if (error) {
            console.error("[v0] Error loading cart:", error)
            return
          }

          const formattedItems =
            cartItems?.map((item: any) => ({
              id: `${item.products.id}::${item.variant_size || ""}::${item.variant_color || ""}::${item.variant_model || ""}`,
              name: item.products.name,
              price: item.products.price,
              quantity: item.quantity,
              stock: item.products.stock,
              variant: {
                size: item.variant_size ?? null,
                color: item.variant_color ?? null,
                model: item.variant_model ?? null,
                image_url: item.variant_image_url ?? null,
              },
              image_url: item.variant_image_url || item.products.image_url,
            })) || []

          set({ items: formattedItems })
        } catch (error) {
          console.error("[v0] Error loading user cart:", error)
        }
      },
      syncCartToDb: async (userId: string) => {
        try {
          const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL || "",
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
          )

          const { items } = get()

          // Clear existing cart items for this user
          await supabase.from("cart_items").delete().eq("user_id", userId)

          // Insert new cart items
          if (items.length > 0) {
            const cartItemsToInsert = items.map((item) => {
              // item.id may include variant key; split it to get base product id
              const [productId] = item.id.split("::")
              return {
                user_id: userId,
                product_id: productId,
                quantity: item.quantity,
                variant_size: (item as any).variant?.size ?? null,
                variant_color: (item as any).variant?.color ?? null,
                variant_model: (item as any).variant?.model ?? null,
                variant_image_url: (item as any).variant?.image_url ?? item.image_url ?? null,
              }
            })

            const { error } = await supabase.from("cart_items").insert(cartItemsToInsert)

            if (error) {
              console.error("[v0] Error syncing cart to database:", error)
            }
          }
        } catch (error) {
          console.error("[v0] Error syncing cart:", error)
        }
      },
    }),
    {
      name: "cart-storage",
    },
  ),
)
