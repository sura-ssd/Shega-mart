"use client"

import { useEffect, useMemo, useState } from "react"
import { usePlatformPreferences } from "@/components/providers/platform-preferences-provider"
import { useProductVariant } from "@/components/products/product-variant-provider"

type ProductImageGalleryProps = {
  productName: string
  images: string[]
}

export function ProductImageGallery({ productName, images }: ProductImageGalleryProps) {
  const { t } = usePlatformPreferences()
  const { selectedVariantImage, selectedVariantImageLabel, variantImageLabels, selectionRevision } = useProductVariant()
  const normalizedImages = useMemo(() => {
    const clean = images.filter((image) => typeof image === "string" && image.trim().length > 0)
    return Array.from(new Set(clean))
  }, [images])

  const fallbackImage = `/placeholder.svg?height=800&width=800&query=${encodeURIComponent(productName)}`
  const galleryImages = normalizedImages.length > 0 ? normalizedImages : [fallbackImage]
  const displayImages = selectedVariantImage
    ? [selectedVariantImage, ...galleryImages.filter((image) => image !== selectedVariantImage)]
    : galleryImages

  const [activeImage, setActiveImage] = useState(galleryImages[0])

  useEffect(() => {
    if (selectedVariantImage) setActiveImage(selectedVariantImage)
  }, [selectedVariantImage, selectionRevision])

  return (
    <div className="space-y-3 animate-scale-in">
      <div className="relative aspect-square overflow-hidden rounded-2xl border-2 border-primary/10 bg-muted shadow-2xl">
        <img
          src={activeImage}
          alt={productName}
          className="h-full w-full object-cover"
          loading="eager"
          decoding="async"
        />
        {selectedVariantImage && activeImage === selectedVariantImage && selectedVariantImageLabel && (
          <div className="absolute bottom-3 left-3 max-w-[calc(100%-1.5rem)] rounded-md border border-white/20 bg-black/65 px-3 py-1.5 text-xs font-medium text-white shadow-lg backdrop-blur-sm">
            {selectedVariantImageLabel}
          </div>
        )}
      </div>

      {displayImages.length > 1 ? (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
          {displayImages.map((image, index) => {
            const isActive = image === activeImage

            return (
              <button
                key={`${image}-${index}`}
                type="button"
                onClick={() => setActiveImage(image)}
                className={`relative aspect-square overflow-hidden rounded-lg border transition ${
                  isActive ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/40"
                }`}
                aria-label={variantImageLabels[image]
                  ? `${t("gallery.viewProductImage", { number: index + 1 })}: ${variantImageLabels[image]}`
                  : t("gallery.viewProductImage", { number: index + 1 })}
                title={variantImageLabels[image]}
              >
                <img
                  src={image}
                  alt={`${productName} ${t("gallery.thumbnail", { number: index + 1 })}`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
                {variantImageLabels[image] && (
                  <span className="absolute inset-x-0 bottom-0 truncate bg-black/65 px-1 py-1 text-[10px] font-medium text-white">
                    {variantImageLabels[image]}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
