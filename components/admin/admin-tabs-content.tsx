"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { UsersTable } from "@/components/admin/users-table"
import { AllProductsTable } from "@/components/admin/all-products-table"
import { CategoriesTable } from "@/components/admin/categories-table"
import { OrdersTable } from "@/components/admin/orders-table"
import { AddCategoryDialog } from "@/components/admin/add-category-dialog"
import { ReturnsTable } from "./returns-table"
import { ModerationQueueTable } from "./moderation-queue-table"
import { usePlatformPreferences } from "@/components/providers/platform-preferences-provider"

interface AdminTabsContentProps {
  users: any[]
  products: any[]
  categories: any[]
  orders: any[]
  returns?: any[]
  moderationQueue?: any[]
}

export function AdminTabsContent({ users, products, categories, orders, returns, moderationQueue }: AdminTabsContentProps) {
  const { t } = usePlatformPreferences()
  return (
    <Tabs defaultValue="users" className="space-y-4 animate-fade-in">
      <div className="overflow-x-auto pb-1">
        <TabsList className="inline-flex h-auto min-w-max gap-1 p-1">
          <TabsTrigger value="users" className="px-3 py-1.5 text-xs sm:text-sm">{t("admin.tabUsers")}</TabsTrigger>
          <TabsTrigger value="products" className="px-3 py-1.5 text-xs sm:text-sm">{t("admin.tabProducts")}</TabsTrigger>
          <TabsTrigger value="categories" className="px-3 py-1.5 text-xs sm:text-sm">{t("admin.tabCategories")}</TabsTrigger>
          <TabsTrigger value="orders" className="px-3 py-1.5 text-xs sm:text-sm">{t("admin.tabOrders")}</TabsTrigger>
          <TabsTrigger value="returns" className="px-3 py-1.5 text-xs sm:text-sm">{t("admin.tabReturns")}</TabsTrigger>
          <TabsTrigger value="moderation" className="px-3 py-1.5 text-xs sm:text-sm">{t("admin.tabModerationQueue")}</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="users">
        <Card>
          <CardHeader>
            <CardTitle>{t("admin.userManagement")}</CardTitle>
          </CardHeader>
          <CardContent>
            <UsersTable users={users || []} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="products">
        <Card>
          <CardHeader>
            <CardTitle>{t("admin.productManagement")}</CardTitle>
          </CardHeader>
          <CardContent>
            <AllProductsTable products={products || []} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="categories">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t("admin.categoryManagement")}</CardTitle>
            <AddCategoryDialog />
          </CardHeader>
          <CardContent>
            <CategoriesTable categories={categories || []} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="orders">
        <Card>
          <CardHeader>
            <CardTitle>{t("admin.orderManagement")}</CardTitle>
          </CardHeader>
          <CardContent>
            <OrdersTable orders={orders || []} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="returns">
        <Card>
          <CardHeader>
            <CardTitle>{t("admin.returnRequestsManagement")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ReturnsTable returns={returns || []} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="moderation">
        <Card>
          <CardHeader>
            <CardTitle>{t("admin.productModerationQueue")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ModerationQueueTable products={moderationQueue || []} />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
