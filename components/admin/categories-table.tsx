"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { Category } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { usePlatformPreferences } from "@/components/providers/platform-preferences-provider"

function formatUtcDate(dateInput: string | null | undefined) {
  if (!dateInput) return "-"
  const date = new Date(dateInput)
  if (Number.isNaN(date.getTime())) return "-"

  const day = String(date.getUTCDate()).padStart(2, "0")
  const month = String(date.getUTCMonth() + 1).padStart(2, "0")
  const year = date.getUTCFullYear()
  return `${day}/${month}/${year}`
}

export function CategoriesTable({ categories }: { categories: Category[] }) {
  const { t } = usePlatformPreferences()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)

    try {
      const { error } = await supabase.from("categories").delete().eq("id", deleteId)

      if (error) throw error

      toast.success(t("admin.categoryDeletedSuccess"))
      setDeleteId(null)
      router.refresh()
    } catch (error) {
      console.error("[v0] Error deleting category:", error)
      toast.error(t("admin.failedToDeleteCategory"))
    } finally {
      setDeleting(false)
    }
  }

  if (categories.length === 0) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <p className="text-muted-foreground">{t("admin.noCategoriesFound")}</p>
      </div>
    )
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("admin.colName")}</TableHead>
            <TableHead>{t("admin.colSlug")}</TableHead>
            <TableHead>{t("admin.colDescription")}</TableHead>
            <TableHead>{t("admin.colCreated")}</TableHead>
            <TableHead className="w-[100px]">{t("admin.colActions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map((category) => (
            <TableRow key={category.id}>
              <TableCell className="font-medium">{category.name}</TableCell>
              <TableCell className="font-mono text-sm">{category.slug}</TableCell>
              <TableCell>{category.description || t("admin.notApplicable")}</TableCell>
              <TableCell>{formatUtcDate(category.created_at)}</TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteId(category.id)}
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.deleteCategoryTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.deleteCategoryConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t("admin.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? t("admin.deleting") : t("admin.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
