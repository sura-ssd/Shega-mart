import { Star } from "lucide-react"
import type { ProductRatingSummary } from "@/lib/product-ratings"

export function ProductRatingBadge({
  summary,
  className = "",
}: {
  summary?: ProductRatingSummary | null
  className?: string
}) {
  if (!summary || summary.count === 0) return null

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-sm ${className}`}
      aria-label={`Rated ${summary.average.toFixed(1)} out of 5 from ${summary.count} reviews`}
    >
      <Star className="h-4 w-4 fill-amber-400 text-amber-500" aria-hidden="true" />
      <span className="font-semibold">{summary.average.toFixed(1)}</span>
      <span className="text-muted-foreground">({summary.count})</span>
    </span>
  )
}
