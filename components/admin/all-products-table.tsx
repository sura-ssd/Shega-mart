"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { usePlatformPreferences } from "@/components/providers/platform-preferences-provider"

interface Product {
  id: string
  name: string
  price: number
  stock: number
  is_active: boolean
  moderation_status?: "pending" | "approved" | "rejected"
  seller: { full_name: string | null } | null
  categories: { name: string } | null
}

export function AllProductsTable({ products }: { products: Product[] }) {
  const { t } = usePlatformPreferences()
  const router = useRouter()
  const supabase = createClient()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      const { error } = await supabase.from("products").delete().eq("id", id)
      if (error) throw error
      router.refresh()
    } catch (error) {
      console.error("[v0] Error deleting product:", error)
    } finally {
      setDeletingId(null)
    }
  }

  if (products.length === 0) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <p className="text-muted-foreground">{t("admin.noProductsFound")}</p>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("admin.colName")}</TableHead>
          <TableHead>{t("admin.colSeller")}</TableHead>
          <TableHead>{t("admin.colCategory")}</TableHead>
          <TableHead>{t("admin.colPrice")}</TableHead>
          <TableHead>{t("admin.colStock")}</TableHead>
          <TableHead>{t("admin.colStatus")}</TableHead>
          <TableHead>{t("admin.colModeration")}</TableHead>
          <TableHead className="text-right">{t("admin.colActions")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product) => (
          <TableRow key={product.id}>
            <TableCell className="font-medium">{product.name}</TableCell>
            <TableCell>{product.seller?.full_name || t("admin.unknownSeller")}</TableCell>
            <TableCell>{product.categories?.name || t("admin.notApplicable")}</TableCell>
            <TableCell>${Number(product.price).toFixed(2)}</TableCell>
            <TableCell>{product.stock}</TableCell>
            <TableCell>
              {product.is_active ? (
                <Badge variant="default">{t("admin.active")}</Badge>
              ) : (
                <Badge variant="secondary">{t("admin.inactive")}</Badge>
              )}
            </TableCell>
            <TableCell>
              <Badge
                variant={
                  product.moderation_status === "approved"
                    ? "default"
                    : product.moderation_status === "rejected"
                      ? "destructive"
                      : "outline"
                }
                className="capitalize"
              >
                {product.moderation_status || t("admin.moderationApproved")}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" disabled={deletingId === product.id}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("admin.deleteProductTitle")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("admin.deleteProductConfirm")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("admin.cancel")}</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDelete(product.id)}>{t("admin.delete")}</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
