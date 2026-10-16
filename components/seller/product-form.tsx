"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import type { Category } from "@/lib/types"
import { X } from "lucide-react"
import { usePlatformPreferences } from "@/components/providers/platform-preferences-provider"
import { buildVariantStockKey, isModelVariantCategory } from "@/lib/product-variants"

interface ProductFormProps {
  categories: Category[]
  product?: {
    id: string
    name: string
    description: string | null
    price: number
    stock: number
    low_stock_threshold?: number
    category_id: string
    is_active: boolean
    moderation_status?: "pending" | "approved" | "rejected"
    image_url: string | null
    image_urls?: string[] | null
    size_options?: string[] | null
    color_options?: string[] | null
    variant_images?: Record<string, string> | null
    variant_stock?: Record<string, number> | null
  }
}

const isFashionCategory = (categoryName?: string | null, categorySlug?: string | null) => {
  const normalizedName = (categoryName || "").toLowerCase()
  const normalizedSlug = (categorySlug || "").toLowerCase()

  const variantKeywords = [
    "clothing",
    "fashion",
    "apparel",
    "shirt",
    "dress",
    "jacket",
    "hoodie",
    "pants",
    "jeans",
    "trouser",
    "suit",
    "shoes",
    "shoe",
    "sneaker",
    "boot",
    "sandals",
    "heels",
    "footwear",
    "hat",
    "bag",
    "accessories",
    "electronics",
    "phone",
    "smartphone",
    "laptop",
    "computer",
    "tablet",
    "headphone",
    "earbuds",
    "speaker",
    "tv",
    "monitor",
    "camera",
    "gaming",
    "gadget",
  ]

  return variantKeywords.some((keyword) => normalizedName.includes(keyword) || normalizedSlug.includes(keyword))
}

export function ProductForm({ categories, product }: ProductFormProps) {
  const { t } = usePlatformPreferences()
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [selectedFilePreviews, setSelectedFilePreviews] = useState<string[]>([])
  const [variantImageSelections, setVariantImageSelections] = useState<Record<string, string>>(product?.variant_images || {})
  const [variantStockValues, setVariantStockValues] = useState<Record<string, number>>(product?.variant_stock || {})

  const toFiniteNumber = (value: unknown, fallback = 0) => {
    const parsed = typeof value === "number" ? value : Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }

  const normalizeOptions = (value: string | string[] | null | undefined) => {
    if (Array.isArray(value)) {
      return value.map((option) => option.trim()).filter(Boolean)
    }

    if (typeof value !== "string") return []

    return value
      .split(",")
      .map((option) => option.trim())
      .filter(Boolean)
  }

  const [formData, setFormData] = useState({
    name: product?.name || "",
    description: product?.description || "",
    price: toFiniteNumber(product?.price, 0),
    stock: toFiniteNumber(product?.stock, 0),
    low_stock_threshold: toFiniteNumber(product?.low_stock_threshold, 5),
    category_id: product?.category_id || "",
    image_url: product?.image_url || "",
    size_options: (product?.size_options || []).join(", ") || "",
    color_options: (product?.color_options || []).join(", ") || "",
  })

  const existingImageUrls = (product?.image_urls || []).filter((url) => typeof url === "string" && url.trim().length > 0)
  const selectedCategory = categories.find((category) => category.id === formData.category_id)
  const showVariantFields = isFashionCategory(selectedCategory?.name, selectedCategory?.slug)
  const isElectronicsCategory = isModelVariantCategory(selectedCategory?.name, selectedCategory?.slug)
  const variantFieldLabel = isElectronicsCategory ? "Available models / storage" : "Available sizes"
  const variantSecondFieldLabel = isElectronicsCategory ? "Available colors" : "Available colors"
  const variantImageEntries = normalizeOptions(formData.color_options).map(
    (color) => [`color:${color}`, `Color: ${color}`] as const,
  )
  const variantStockEntries = (() => {
    const primaryOptions = normalizeOptions(formData.size_options)
    const colors = normalizeOptions(formData.color_options)
    const primaryKey = isElectronicsCategory ? "model" : "size"

    if (primaryOptions.length > 0 && colors.length > 0) {
      return primaryOptions.flatMap((primary) =>
        colors.map((color) => [
          buildVariantStockKey(primaryKey, primary, color)!,
          `${primary} / ${color}`,
        ] as const),
      )
    }

    if (primaryOptions.length > 0) {
      return primaryOptions.map((primary) => [buildVariantStockKey(primaryKey, primary)!, primary] as const)
    }

    return colors.map((color) => [buildVariantStockKey(primaryKey, null, color)!, color] as const)
  })()

  const mergeSelectedFiles = (previousFiles: File[], incomingFiles: File[]) => {
    const nextFiles = [...previousFiles]
    const seen = new Set(previousFiles.map((file) => `${file.name}:${file.size}:${file.lastModified}`))

    for (const file of incomingFiles) {
      const key = `${file.name}:${file.size}:${file.lastModified}`
      if (!seen.has(key)) {
        nextFiles.push(file)
        seen.add(key)
      }
    }

    return nextFiles
  }

  const removeSelectedFileAt = (indexToRemove: number) => {
    setSelectedFiles((previousFiles) => previousFiles.filter((_, index) => index !== indexToRemove))
    setVariantImageSelections((current) =>
      Object.fromEntries(
        Object.entries(current).flatMap(([key, value]) => {
          if (!value.startsWith("upload:")) return [[key, value]]
          const selectedIndex = Number(value.slice("upload:".length))
          if (selectedIndex === indexToRemove) return []
          return [[key, selectedIndex > indexToRemove ? `upload:${selectedIndex - 1}` : value]]
        }),
      ),
    )
  }

  useEffect(() => {
    if (selectedFiles.length === 0) {
      setSelectedFilePreviews([])
      return
    }

    const nextPreviews = selectedFiles.map((file) => URL.createObjectURL(file))
    setSelectedFilePreviews(nextPreviews)

    return () => {
      nextPreviews.forEach((previewUrl) => URL.revokeObjectURL(previewUrl))
    }
  }, [selectedFiles])

  const uploadImages = async (userId: string) => {
    if (selectedFiles.length === 0) {
      return [] as string[]
    }

    const uploadedUrls: string[] = []

    for (const [index, file] of selectedFiles.entries()) {
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "-")
      const filePath = `${userId}/${Date.now()}-${index}-${safeName}`

      const { error: uploadError } = await supabase.storage.from("product-images").upload(filePath, file)
      if (uploadError) {
        throw new Error(`Image upload failed: ${uploadError.message}`)
      }

      const { data: publicUrlData } = supabase.storage.from("product-images").getPublicUrl(filePath)
      if (publicUrlData?.publicUrl) {
        uploadedUrls.push(publicUrlData.publicUrl)
      }
    }

    return uploadedUrls
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error(t("seller.notAuthenticated"))

      const uploadedImageUrls = await uploadImages(user.id)
      const manualImageUrl = formData.image_url.trim()
      const allImageUrls = Array.from(
        new Set([
          ...existingImageUrls,
          ...uploadedImageUrls,
          ...(manualImageUrl ? [manualImageUrl] : []),
        ]),
      )

      const savedVariantImages = Object.fromEntries(
        Object.entries(variantImageSelections)
          .filter(([variantKey]) => variantImageEntries.some(([allowedKey]) => allowedKey === variantKey))
          .map(([variantKey, imageChoice]) => [
            variantKey,
            imageChoice.startsWith("upload:")
              ? uploadedImageUrls[Number(imageChoice.slice("upload:".length))] || ""
              : imageChoice,
          ])
          .filter(([, imageUrl]) => typeof imageUrl === "string" && imageUrl.length > 0 && imageUrl !== "none"),
      )
      const configuredVariantStock = Object.fromEntries(
        variantStockEntries.map(([variantKey]) => [
          variantKey,
          Math.max(0, Math.trunc(Number(variantStockValues[variantKey]) || 0)),
        ]),
      )

      const totalVariantStock = Object.values(configuredVariantStock).reduce((sum, quantity) => sum + quantity, 0)
      if (totalVariantStock > formData.stock) {
        throw new Error("Total variant stock cannot exceed the product's overall stock.")
      }
      const savedVariantStock = totalVariantStock > 0 ? configuredVariantStock : {}

      if (!product && allImageUrls.length < 3) {
        throw new Error(t("seller.minImagesRequired"))
      }

      const payload = {
        ...formData,
        size_options: normalizeOptions(formData.size_options),
        color_options: normalizeOptions(formData.color_options),
        variant_images: savedVariantImages,
        variant_stock: savedVariantStock,
        image_url: allImageUrls[0] || null,
        image_urls: allImageUrls,
      }

      if (product) {
        // Update existing product
        const { error } = await supabase
          .from("products")
          .update({
            ...payload,
            moderation_status: "pending",
            moderation_notes: null,
            is_active: false,
          })
          .eq("id", product.id)
        if (error) throw error
        toast.success(t("seller.productUpdatedSuccess"), {
          description: t("seller.productUpdatedDesc"),
        })
      } else {
        // Create new product
        const { error } = await supabase.from("products").insert({
          ...payload,
          seller_id: user.id,
          moderation_status: "pending",
          is_active: false,
        })
        if (error) throw error
        toast.success(t("seller.productCreatedSuccess"), {
          description: t("seller.productCreatedDesc"),
        })

        // Create notification for seller
        try {
          // Find category name
          const categoryName = categories.find((c) => c.id === formData.category_id)?.name || "Product"

          const notifRes = await fetch("/api/notifications/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "product_created",
              productName: formData.name,
              category: categoryName,
            }),
          })
          console.log("[v0] Product created notification sent")
        } catch (error) {
          console.error("[v0] Error creating product notification:", error)
        }
      }

      // Wait a moment for the toast to be seen before redirecting
      await new Promise((resolve) => setTimeout(resolve, 1000))
      
      await router.push("/seller")
      router.refresh()
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : t("seller.genericError")
      setError(errorMsg)
      toast.error(t("seller.failedToSaveProduct"), {
        description: errorMsg,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">{t("seller.productNameLabel")}</Label>
            <Input
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t("seller.descriptionLabel")}</Label>
            <Textarea
              id="description"
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="price">{t("seller.priceLabel")}</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                required
                value={formData.price}
                onChange={(e) => {
                  const nextPrice = Number.parseFloat(e.target.value)
                  setFormData({ ...formData, price: Number.isFinite(nextPrice) ? nextPrice : 0 })
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stock">{t("seller.stockLabel")}</Label>
              <Input
                id="stock"
                type="number"
                min="0"
                required
                value={formData.stock}
                onChange={(e) => {
                  const nextStock = Number.parseInt(e.target.value, 10)
                  setFormData({ ...formData, stock: Number.isFinite(nextStock) ? nextStock : 0 })
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="low_stock_threshold">{t("seller.lowStockAlertAtLabel")}</Label>
              <Input
                id="low_stock_threshold"
                type="number"
                min="0"
                required
                value={formData.low_stock_threshold}
                onChange={(e) => {
                  const nextThreshold = Number.parseInt(e.target.value, 10)
                  setFormData({ ...formData, low_stock_threshold: Number.isFinite(nextThreshold) ? nextThreshold : 0 })
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">{t("seller.categoryLabel")}</Label>
            <Select
              value={formData.category_id}
              onValueChange={(value) => setFormData({ ...formData, category_id: value })}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder={t("seller.selectCategory")} />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {showVariantFields && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="size_options">{variantFieldLabel}</Label>
                <Input
                  id="size_options"
                  placeholder={isElectronicsCategory ? "128GB, 256GB, Pro Max" : "S, M, L, XL"}
                  value={formData.size_options}
                  onChange={(e) => setFormData({ ...formData, size_options: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="color_options">{variantSecondFieldLabel}</Label>
                <Input
                  id="color_options"
                  placeholder={isElectronicsCategory ? "Black, Silver, Blue" : "Black, White, Red"}
                  value={formData.color_options}
                  onChange={(e) => setFormData({ ...formData, color_options: e.target.value })}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="image_url">{t("seller.imageUrlOptional")}</Label>
            <Input
              id="image_url"
              type="url"
              placeholder="https://example.com/image.jpg"
              value={formData.image_url}
              onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="image_files">{t("seller.uploadImagesFromDevice")}</Label>
            <Input
              id="image_files"
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files || [])
                setSelectedFiles((previousFiles) => mergeSelectedFiles(previousFiles, files))
                e.currentTarget.value = ""
              }}
            />
            <p className="text-xs text-muted-foreground">
              {t("seller.minImagesHint")}
            </p>
            {selectedFiles.length > 0 ? (
              <p className="text-xs text-muted-foreground">{t("seller.filesSelected", { count: selectedFiles.length })}</p>
            ) : null}
            {selectedFilePreviews.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {selectedFilePreviews.map((previewUrl, index) => (
                  <div key={`${previewUrl}-${index}`} className="relative overflow-hidden rounded-md border">
                    <img
                      src={previewUrl}
                      alt={`Selected product image ${index + 1}`}
                      className="h-24 w-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      className="absolute right-1 top-1 h-6 w-6"
                      onClick={() => removeSelectedFileAt(index)}
                      aria-label={`Remove selected image ${index + 1}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : null}
            {existingImageUrls.length > 0 ? (
              <p className="text-xs text-muted-foreground">{t("seller.alreadyHasImages", { count: existingImageUrls.length })}</p>
            ) : null}
            {showVariantFields && variantImageEntries.length > 0 && (
              <div className="space-y-3 rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Color images (optional)</p>
                  <p className="text-xs text-muted-foreground">Sizes and models use the product images above.</p>
                </div>
                {variantImageEntries.map(([variantKey, label]) => (
                  <div key={variantKey} className="grid gap-2 sm:grid-cols-[140px_1fr] sm:items-center">
                    <Label htmlFor={`variant-image-${variantKey}`}>{label}</Label>
                    <Select
                      value={variantImageSelections[variantKey] || "none"}
                      onValueChange={(value) => setVariantImageSelections((current) => ({ ...current, [variantKey]: value }))}
                    >
                      <SelectTrigger id={`variant-image-${variantKey}`}>
                        <SelectValue placeholder="Use main product image" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Use main product image</SelectItem>
                        {existingImageUrls.map((imageUrl, index) => (
                          <SelectItem key={imageUrl} value={imageUrl}>Product image {index + 1}</SelectItem>
                        ))}
                        {formData.image_url.trim() && !existingImageUrls.includes(formData.image_url.trim()) && (
                          <SelectItem value={formData.image_url.trim()}>Image URL</SelectItem>
                        )}
                        {selectedFiles.map((file, index) => (
                          <SelectItem key={`${file.name}-${index}`} value={`upload:${index}`}>{file.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            )}
            {showVariantFields && variantStockEntries.length > 0 && (
              <div className="space-y-3 rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Stock by variant</p>
                  <p className="text-xs text-muted-foreground">Set combination quantities to track stock separately. If all are left at zero, the product’s overall stock applies to every option.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {variantStockEntries.map(([variantKey, label]) => (
                    <div key={variantKey} className="grid grid-cols-[1fr_6rem] items-center gap-3">
                      <Label htmlFor={`variant-stock-${variantKey}`} className="text-sm">{label}</Label>
                      <Input
                        id={`variant-stock-${variantKey}`}
                        type="number"
                        min="0"
                        step="1"
                        value={variantStockValues[variantKey] ?? 0}
                        onChange={(event) => {
                          const quantity = Number.parseInt(event.target.value, 10)
                          setVariantStockValues((current) => ({
                            ...current,
                            [variantKey]: Number.isFinite(quantity) ? Math.max(0, quantity) : 0,
                          }))
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
            {t("seller.moderationNotice")}
          </div>

          {error && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

          <div className="flex gap-4">
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? t("seller.saving") : product ? t("seller.updateProduct") : t("seller.createProduct")}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              {t("seller.cancelAction")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
