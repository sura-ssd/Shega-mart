"use client"

import { createContext, useContext, useMemo, useState, type ReactNode } from "react"
import { getVariantStockQuantity, type PrimaryVariantAttribute } from "@/lib/product-variants"

export interface ProductVariantSelection {
  size: string | null
  color: string | null
  model: string | null
  image_url: string | null
}

interface ProductVariantContextValue {
  selectedVariant: ProductVariantSelection
  selectedVariantImage: string | null
  selectedVariantImageLabel: string | null
  variantImageLabels: Record<string, string>
  selectionRevision: number
  selectedVariantStock: number | null
  selectionReady: boolean
  isOptionAvailable: (attribute: "size" | "color" | "model", value: string) => boolean
  isOptionAvailableWithCurrentSelection: (attribute: "size" | "color" | "model", value: string) => boolean
  selectVariant: (attribute: "size" | "color" | "model", value: string) => void
}

const ProductVariantContext = createContext<ProductVariantContextValue | null>(null)

export function ProductVariantProvider({
  variantImages,
  variantStock,
  stock,
  primaryAttribute,
  primaryOptions,
  colorOptions,
  children,
}: {
  variantImages: Record<string, string>
  variantStock: Record<string, number>
  stock: number
  primaryAttribute: PrimaryVariantAttribute
  primaryOptions: string[]
  colorOptions: string[]
  children: ReactNode
}) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariantSelection>({
    size: null,
    color: null,
    model: null,
    image_url: null,
  })
  const [activeAttribute, setActiveAttribute] = useState<"size" | "color" | "model" | null>(null)
  const [selectionRevision, setSelectionRevision] = useState(0)
  const selectedPrimary = primaryAttribute === "model" ? selectedVariant.model : selectedVariant.size

  const getStockForCombination = (primary: string | null, color: string | null) => {
    return getVariantStockQuantity(variantStock, primaryAttribute, primary, color, stock)
  }

  const isOptionAvailable = (attribute: "size" | "color" | "model", value: string) => {
    const primaryCandidates = attribute === primaryAttribute
      ? [value]
      : primaryOptions.length > 0
        ? primaryOptions
        : [null]
    const colorCandidates = attribute === "color"
      ? [value]
      : colorOptions.length > 0
        ? colorOptions
        : [null]

    return primaryCandidates.some((primary) =>
      colorCandidates.some((color) => getStockForCombination(primary, color) > 0),
    )
  }

  const isOptionAvailableWithCurrentSelection = (attribute: "size" | "color" | "model", value: string) => {
    const primaryCandidates = attribute === primaryAttribute
      ? [value]
      : selectedPrimary
        ? [selectedPrimary]
        : primaryOptions.length > 0
          ? primaryOptions
          : [null]
    const colorCandidates = attribute === "color"
      ? [value]
      : selectedVariant.color
        ? [selectedVariant.color]
        : colorOptions.length > 0
          ? colorOptions
          : [null]

    return primaryCandidates.some((primary) =>
      colorCandidates.some((color) => getStockForCombination(primary, color) > 0),
    )
  }

  const selectionReady =
    (primaryOptions.length === 0 || Boolean(selectedPrimary)) &&
    (colorOptions.length === 0 || Boolean(selectedVariant.color))
  const selectedVariantStock = selectionReady
    ? getStockForCombination(selectedPrimary, selectedVariant.color)
    : null

  const variantImageLabels = useMemo(() => {
    const labels: Record<string, string[]> = {}
    for (const [key, imageUrl] of Object.entries(variantImages)) {
      const [attribute, ...nameParts] = key.split(":")
      const name = nameParts.join(":")
      if (!imageUrl || !name) continue
      const label = `${attribute === "color" ? "Color" : attribute === "model" ? "Model" : "Size"}: ${name}`
      labels[imageUrl] = [...(labels[imageUrl] || []), label]
    }
    return Object.fromEntries(Object.entries(labels).map(([imageUrl, names]) => [imageUrl, names.join(" / ")]))
  }, [variantImages])

  const selectedVariantImage = useMemo(() => {
    const primaryOption = selectedVariant.model || selectedVariant.size
    const primaryKey = primaryOption ? `${selectedVariant.model ? "model" : "size"}:${primaryOption}` : null
    const colorKey = selectedVariant.color ? `color:${selectedVariant.color}` : null
    const preferredKey = activeAttribute === "color" ? colorKey : primaryKey
    const fallbackKey = activeAttribute === "color" ? primaryKey : colorKey

    if (preferredKey && variantImages[preferredKey]) return variantImages[preferredKey]
    if (fallbackKey && variantImages[fallbackKey]) return variantImages[fallbackKey]
    if (primaryKey && variantImages[primaryKey]) return variantImages[primaryKey]
    if (colorKey && variantImages[colorKey]) return variantImages[colorKey]
    return null
  }, [activeAttribute, selectedVariant.color, selectedVariant.model, selectedVariant.size, variantImages])

  const selectedVariantImageLabel = selectedVariantImage ? variantImageLabels[selectedVariantImage] || null : null

  const value = useMemo<ProductVariantContextValue>(
    () => ({
      selectedVariant: { ...selectedVariant, image_url: selectedVariantImage },
      selectedVariantImage,
      selectedVariantImageLabel,
      variantImageLabels,
      selectionRevision,
      selectedVariantStock,
      selectionReady,
      isOptionAvailable,
      isOptionAvailableWithCurrentSelection,
      selectVariant: (attribute, value) => {
        setActiveAttribute(attribute)
        setSelectionRevision((revision) => revision + 1)
        setSelectedVariant((current) => ({
          ...current,
          [attribute]: current[attribute] === value ? null : value,
          ...(current[attribute] === value
            ? {}
            : attribute === primaryAttribute && current.color && getStockForCombination(value, current.color) <= 0
              ? { color: null }
              : attribute === "color" && (current.model || current.size) &&
                  getStockForCombination(primaryAttribute === "model" ? current.model : current.size, value) <= 0
                ? { [primaryAttribute]: null }
                : {}),
        }))
      },
    }),
    [selectedVariant, selectedVariantImage, selectedVariantImageLabel, variantImageLabels, selectionRevision, selectedVariantStock, selectionReady, isOptionAvailable, isOptionAvailableWithCurrentSelection, primaryAttribute, primaryOptions, colorOptions],
  )

  return <ProductVariantContext.Provider value={value}>{children}</ProductVariantContext.Provider>
}

export function useProductVariant() {
  const context = useContext(ProductVariantContext)
  if (!context) {
    throw new Error("useProductVariant must be used inside ProductVariantProvider")
  }
  return context
}
