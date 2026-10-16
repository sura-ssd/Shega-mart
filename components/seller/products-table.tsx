"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Edit, Trash2 } from "lucide-react"
import Link from "next/link"
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
  low_stock_threshold?: number
  is_active: boolean
  moderation_status?: "pending" | "approved" | "rejected"
  categories: { name: string } | null
}

export function ProductsTable({ products }: { products: Product[] }) {
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
        <div className="text-center">
          <p className="mb-2 text-lg font-medium">{t("seller.noProductsTitle")}</p>
          <p className="mb-4 text-sm text-muted-foreground">{t("seller.noProductsSubtitle")}</p>
          <Button asChild>
            <Link href="/seller/products/new">{t("seller.addProduct")}</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("seller.colName")}</TableHead>
          <TableHead>{t("seller.colCategory")}</TableHead>
          <TableHead>{t("seller.colPrice")}</TableHead>
          <TableHead>{t("seller.colStock")}</TableHead>
          <TableHead>{t("seller.colLowStockAlert")}</TableHead>
          <TableHead>{t("seller.colStatus")}</TableHead>
          <TableHead>{t("seller.colModeration")}</TableHead>
          <TableHead className="text-right">{t("seller.colActions")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product) => (
          <TableRow key={product.id}>
            <TableCell className="font-medium">{product.name}</TableCell>
            <TableCell>{product.categories?.name || t("seller.notApplicable")}</TableCell>
            <TableCell>${Number(product.price).toFixed(2)}</TableCell>
            <TableCell>{product.stock}</TableCell>
            <TableCell>{product.low_stock_threshold ?? 5}</TableCell>
            <TableCell>
              {product.is_active ? (
                <Badge variant="default">{t("seller.active")}</Badge>
              ) : (
                <Badge variant="secondary">{t("seller.inactive")}</Badge>
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
                {product.moderation_status || t("seller.moderationApproved")}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button asChild variant="ghost" size="icon">
                  <Link href={`/seller/products/${product.id}/edit`}>
                    <Edit className="h-4 w-4" />
                  </Link>
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" disabled={deletingId === product.id}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t("seller.deleteProductTitle")}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t("seller.deleteProductConfirm")}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t("seller.cancel")}</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(product.id)}>{t("seller.delete")}</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
