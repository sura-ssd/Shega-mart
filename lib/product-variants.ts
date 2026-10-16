export type PrimaryVariantAttribute = "size" | "model"

const MODEL_CATEGORY_PATTERN = /electronics|phone|smartphone|laptop|computer|tablet|headphone|earbuds|speaker|tv|monitor|camera|gaming|gadget/i

export function isModelVariantCategory(categoryName?: string | null, categorySlug?: string | null) {
  return MODEL_CATEGORY_PATTERN.test(`${categoryName || ""} ${categorySlug || ""}`)
}

export function buildVariantStockKey(
  primaryAttribute: PrimaryVariantAttribute,
  primaryOption?: string | null,
  colorOption?: string | null,
) {
  const primary = primaryOption?.trim() || null
  const color = colorOption?.trim() || null
  const primaryKey = primary ? `${primaryAttribute}:${primary}` : null

  if (primaryKey && color) return `${primaryKey}|color:${color}`
  return primaryKey || (color ? `color:${color}` : null)
}

export function hasConfiguredVariantStock(variantStock: Record<string, number>) {
  return Object.values(variantStock).some((quantity) => Number(quantity) > 0)
}

export function getVariantStockQuantity(
  variantStock: Record<string, number>,
  primaryAttribute: PrimaryVariantAttribute,
  primaryOption: string | null,
  colorOption: string | null,
  productStock: number,
) {
  if (!hasConfiguredVariantStock(variantStock)) return productStock

  const key = buildVariantStockKey(primaryAttribute, primaryOption, colorOption)
  if (!key) return 0

  const quantity = Number(variantStock[key])
  return Math.min(productStock, Number.isFinite(quantity) ? Math.max(0, quantity) : 0)
}
