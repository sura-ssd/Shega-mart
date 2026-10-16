import type { SupabaseClient } from "@supabase/supabase-js"

export type ProductRatingSummary = {
  average: number
  count: number
}

export async function getProductRatingSummaries(
  supabase: SupabaseClient,
  productIds: string[],
): Promise<Record<string, ProductRatingSummary>> {
  const uniqueIds = Array.from(new Set(productIds.filter(Boolean)))
  if (uniqueIds.length === 0) return {}

  const { data, error } = await supabase
    .from("product_reviews")
    .select("product_id, rating")
    .in("product_id", uniqueIds)

  if (error) {
    console.error("[v0] Failed to load product rating summaries:", error)
    return {}
  }

  const totals: Record<string, { sum: number; count: number }> = {}
  for (const review of data || []) {
    const current = totals[review.product_id] || { sum: 0, count: 0 }
    current.sum += Number(review.rating) || 0
    current.count += 1
    totals[review.product_id] = current
  }

  return Object.fromEntries(
    Object.entries(totals).map(([productId, total]) => [
      productId,
      { average: total.sum / total.count, count: total.count },
    ]),
  )
}
