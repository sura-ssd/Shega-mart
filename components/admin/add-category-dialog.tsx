"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { usePlatformPreferences } from "@/components/providers/platform-preferences-provider"

export function AddCategoryDialog() {
  const { t } = usePlatformPreferences()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    image_url: "",
  })
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.from("categories").insert([
        {
          name: formData.name,
          slug: formData.slug || formData.name.toLowerCase().replace(/\s+/g, "-"),
          description: formData.description,
          image_url:
            formData.image_url || `/placeholder.svg?height=400&width=600&query=${encodeURIComponent(formData.name)}`,
        },
      ])

      if (error) throw error

      toast.success(t("admin.categoryCreatedSuccess"))
      setOpen(false)
      setFormData({ name: "", slug: "", description: "", image_url: "" })
      router.refresh()
    } catch (error) {
      console.error("[v0] Error creating category:", error)
      toast.error(t("admin.failedToCreateCategory"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          {t("admin.addCategoryBtn")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("admin.addNewCategoryTitle")}</DialogTitle>
            <DialogDescription>{t("admin.addNewCategoryDesc")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">{t("admin.categoryNameRequired")}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t("admin.categoryNamePlaceholder")}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="slug">{t("admin.slugLabel")}</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder={t("admin.slugPlaceholder")}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">{t("admin.descriptionLabel")}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t("admin.descriptionPlaceholder")}
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="image_url">{t("admin.imageUrlLabel")}</Label>
              <Input
                id="image_url"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                placeholder={t("admin.imageUrlPlaceholder")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              {t("admin.cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t("admin.creating") : t("admin.createCategory")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
