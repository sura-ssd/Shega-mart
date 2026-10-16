"use client"

import { useProductVariant } from "@/components/products/product-variant-provider"

interface ProductVariantOptionsProps {
  sizeOptions: string[]
  colorOptions: string[]
  sizeLabel: string
  sizeAttribute: "size" | "model"
}

export function ProductVariantOptions({ sizeOptions, colorOptions, sizeLabel, sizeAttribute }: ProductVariantOptionsProps) {
  const {
    selectedVariant,
    selectVariant,
    isOptionAvailable,
    isOptionAvailableWithCurrentSelection,
    selectionReady,
    selectedVariantStock,
  } = useProductVariant()

  return (
    <div className="mb-8 space-y-5 rounded-2xl border border-border/80 bg-muted/20 p-4">
      {sizeOptions.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">{sizeLabel}</p>
          <div className="flex flex-wrap gap-2">
            {sizeOptions.map((size) => {
              const available = isOptionAvailable(sizeAttribute, size)
              const availableWithCurrentSelection = isOptionAvailableWithCurrentSelection(sizeAttribute, size)
              const needsDifferentColor = available && !availableWithCurrentSelection && Boolean(selectedVariant.color)
              return (
                <button
                  key={size}
                  type="button"
                  disabled={!available}
                  aria-pressed={selectedVariant[sizeAttribute] === size}
                  aria-label={`${sizeLabel}: ${size}${!available ? ", not in stock" : needsDifferentColor ? ", available with another color" : ""}`}
                  title={!available ? "Not in stock" : needsDifferentColor ? "Available with another color" : size}
                  onClick={() => selectVariant(sizeAttribute, size)}
                  className={`flex min-h-11 flex-col items-center justify-center rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                    !available
                      ? "cursor-not-allowed border-border/60 bg-muted/60 text-muted-foreground line-through opacity-70"
                      : needsDifferentColor
                        ? "border-amber-500/70 bg-amber-500/5 text-foreground hover:border-amber-500"
                        : selectedVariant[sizeAttribute] === size
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:border-primary hover:text-primary"
                  }`}
                >
                  <span>{size}</span>
                  {!available ? (
                    <span className="text-[10px] leading-3 no-underline">Not in stock</span>
                  ) : needsDifferentColor ? (
                    <span className="text-[10px] leading-3 no-underline">Choose another color</span>
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {colorOptions.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">Color</p>
          <div className="flex flex-wrap gap-2">
            {colorOptions.map((color) => {
              const available = isOptionAvailable("color", color)
              const availableWithCurrentSelection = isOptionAvailableWithCurrentSelection("color", color)
              const needsDifferentSize = available && !availableWithCurrentSelection && Boolean(selectedVariant.model || selectedVariant.size)
              return (
                <button
                  key={color}
                  type="button"
                  disabled={!available}
                  aria-pressed={selectedVariant.color === color}
                  aria-label={`Color: ${color}${!available ? ", not in stock" : needsDifferentSize ? ", available with another size or model" : ""}`}
                  title={!available ? "Not in stock" : needsDifferentSize ? "Available with another size or model" : color}
                  onClick={() => selectVariant("color", color)}
                  className={`flex min-h-11 flex-col items-center justify-center rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                    !available
                      ? "cursor-not-allowed border-border/60 bg-muted/60 text-muted-foreground line-through opacity-70"
                      : needsDifferentSize
                        ? "border-amber-500/70 bg-amber-500/5 text-foreground hover:border-amber-500"
                        : selectedVariant.color === color
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:border-primary hover:text-primary"
                  }`}
                >
                  <span>{color}</span>
                  {!available ? (
                    <span className="text-[10px] leading-3 no-underline">Not in stock</span>
                  ) : needsDifferentSize ? (
                    <span className="text-[10px] leading-3 no-underline">Choose another size/model</span>
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {selectionReady && selectedVariantStock === 0 && (
        <p role="status" className="text-sm font-medium text-destructive">This variant is not in stock.</p>
      )}
      {selectionReady && selectedVariantStock !== null && selectedVariantStock > 0 && (
        <p role="status" className="text-sm text-muted-foreground">{selectedVariantStock} in stock for this variant</p>
      )}
    </div>
  )
}
