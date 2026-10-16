"use client"

import { Star } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import { usePlatformPreferences } from "@/components/providers/platform-preferences-provider"

type Review = {
  id: string
  user_id: string
  rating: number
  review_text: string | null
  created_at: string
  profiles?: { full_name: string | null } | null
}

export function ProductReviews({ productId }: { productId: string }) {
  const { t } = usePlatformPreferences()
  const supabase = useMemo(() => createClient(), [])
  const [reviews, setReviews] = useState<Review[]>([])
  const [rating, setRating] = useState(5)
  const [reviewText, setReviewText] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const averageRating = reviews.length
    ? (reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / reviews.length).toFixed(1)
    : null

  const loadReviews = async () => {
    const { data, error } = await supabase
      .from("product_reviews")
      .select("id, user_id, rating, review_text, created_at")
      .eq("product_id", productId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Failed to load reviews:", error)
      return
    }

    const baseReviews = (data as Review[]) || []
    if (baseReviews.length === 0) {
      setReviews([])
      return
    }

    const userIds = Array.from(new Set(baseReviews.map((review) => review.user_id).filter(Boolean)))

    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds)

    if (profilesError) {
      console.error("[v0] Failed to load review author profiles:", profilesError)
      setReviews(baseReviews)
      return
    }

    const profileMap = new Map((profilesData || []).map((profile) => [profile.id, profile.full_name]))

    setReviews(
      baseReviews.map((review) => ({
        ...review,
        profiles: { full_name: profileMap.get(review.user_id) || null },
      })),
    )
  }

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setCurrentUserId(user?.id || null)
      await loadReviews()
    }

    void load()
  }, [productId, supabase])

  const handleSubmit = async () => {
    if (!currentUserId) {
      toast.error(t("reviews.pleaseSignIn"))
      return
    }

    setIsSubmitting(true)
    try {
      const { error } = await supabase.from("product_reviews").upsert(
        {
          user_id: currentUserId,
          product_id: productId,
          rating,
          review_text: reviewText.trim() || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,product_id" },
      )

      if (error) throw error

      toast.success(t("reviews.submitted"))
      setReviewText("")
      await loadReviews()
    } catch (error) {
      console.error("[v0] Failed to submit review:", error)
      toast.error(t("reviews.failedToSubmit"))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="mt-8 border-primary/10">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3">
          <span>{t("reviews.title")}</span>
          <span className="text-sm font-medium text-muted-foreground">
            {averageRating
              ? t("reviews.ratingSummary", { average: averageRating, count: reviews.length, plural: reviews.length === 1 ? "" : "s" })
              : t("reviews.noReviewsYet")}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-xl border border-border/70 p-4">
          <p className="mb-3 text-sm font-medium">{t("reviews.writeReview")}</p>
          <div className="mb-3 flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setRating(value)}
                className="rounded p-1"
                aria-label={t("reviews.setRating", { value })}
              >
                <Star className={`h-5 w-5 ${value <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
              </button>
            ))}
          </div>
          <Textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder={t("reviews.shareExperience")}
            className="mb-3"
          />
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? t("reviews.submitting") : t("reviews.submitReview")}
          </Button>
        </div>

        <div className="space-y-3">
          {reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("reviews.noReviewsMessage")}</p>
          ) : (
            reviews.map((review) => (
              <div key={review.id} className="rounded-xl border border-border/60 p-3">
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-sm font-semibold">{review.profiles?.full_name || t("reviews.customerFallback")}</p>
                  <p className="text-xs text-muted-foreground">{new Date(review.created_at).toUTCString().slice(5, 16)}</p>
                </div>
                <div className="mb-2 flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <Star
                      key={`${review.id}-${value}`}
                      className={`h-4 w-4 ${value <= review.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
                    />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">{review.review_text || t("reviews.noWrittenComment")}</p>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
