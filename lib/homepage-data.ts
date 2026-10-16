import { unstable_cache } from "next/cache"
import { createAdminClient } from "@/lib/supabase/server-admin"

type HomepageProduct = {
  id: string
  name: string
  description: string | null
  image_url: string | null
  price: number | string
  stock: number
}

type HomepageCategory = {
  id: string
  name: string
  slug: string
  description: string | null
  image_url: string | null
}

export const getFeaturedProducts = unstable_cache(
  async (): Promise<HomepageProduct[]> => {
    const adminClient = createAdminClient()

    const { data: allOrderItems, error: orderItemsError } = await adminClient
      .from("order_items")
      .select("product_id, quantity")

    if (orderItemsError) {
      console.error("[v0] Failed to fetch featured products:", orderItemsError.message)
      return []
    }

    const topProducts = (allOrderItems as Array<{ product_id: string; quantity: number }> | null) || []
    const productCounts = topProducts.reduce((acc, item) => {
      if (!item.product_id) return acc
      const quantity = Number(item.quantity) || 0
      acc[item.product_id] = (acc[item.product_id] || 0) + quantity
      return acc
    }, {} as Record<string, number>)

    const featuredIds = Object.entries(productCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([productId]) => productId)

    if (!featuredIds || featuredIds.length === 0) {
      const { data, error } = await adminClient
        .from("products")
        .select("id, name, description, image_url, price, stock")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(8)

      if (error) {
        console.error("[v0] Failed to fetch featured products:", error.message)
        return []
      }

      return (data as HomepageProduct[]) || []
    }

    const { data: products, error: productsError } = await adminClient
      .from("products")
      .select("id, name, description, image_url, price, stock")
      .in("id", featuredIds)
      .eq("is_active", true)

    if (productsError) {
      console.error("[v0] Failed to fetch featured products:", productsError.message)
      return []
    }

    const productsById = new Map((products as HomepageProduct[]).map((product) => [product.id, product]))

    return featuredIds
      .map((id) => productsById.get(id))
      .filter((product): product is HomepageProduct => Boolean(product))
  },
  ["home-featured-products"],
  { revalidate: 120 },
)

export const getHomepageCategories = unstable_cache(
  async (): Promise<HomepageCategory[]> => {
    const adminClient = createAdminClient()

    const { data, error } = await adminClient
      .from("categories")
      .select("id, name, slug, description, image_url")
      .order("created_at", { ascending: false })
      .limit(4)

    if (error) {
      console.error("[v0] Failed to fetch homepage categories:", error.message)
      return []
    }

    return (data as HomepageCategory[]) || []
  },
  ["home-categories"],
  { revalidate: 300 },
)
