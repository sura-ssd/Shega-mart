"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, ShoppingBag, Layers, Users } from "lucide-react"
import { AdminTabsContent } from "@/components/admin/admin-tabs-content"
import { useIsMobile } from "@/hooks/use-mobile"
import { usePlatformPreferences } from "@/components/providers/platform-preferences-provider"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"

interface AdminDashboardClientProps {
  revenueByDay: any[]
  statusChartData: any[]
  categoryChartData: any[]
  roleChartData: any[]
  users: any[]
  products: any[]
  categories: any[]
  orders: any[]
  returns?: any[]
  moderationQueue?: any[]
}

const CATEGORY_COLORS = ["#3B82F6", "#EC4899", "#10B981", "#F59E0B", "#8B5CF6", "#14B8A6", "#F97316", "#06B6D4"]

function truncateLabel(value: string, max = 10) {
  if (!value) return ""
  return value.length > max ? `${value.slice(0, max - 1)}…` : value
}

export function AdminDashboardClient({
  revenueByDay,
  statusChartData,
  categoryChartData,
  roleChartData,
  users,
  products,
  categories,
  orders,
  returns,
  moderationQueue,
}: AdminDashboardClientProps) {
  const { t } = usePlatformPreferences()
  const isMobile = useIsMobile()

  const mobileStatusSummary = statusChartData
    .slice()
    .sort((a, b) => Number(b.value) - Number(a.value))
    .slice(0, 4)

  const mobileRoleSummary = roleChartData
    .slice()
    .sort((a, b) => Number(b.value) - Number(a.value))
    .slice(0, 3)

  return (
    <div className="mb-8 grid gap-4 sm:gap-6 md:grid-cols-2 animate-fade-in">
      <Card className="min-w-0 overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            {t("admin.revenueTrend")}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-4 sm:px-6">
          <div className="h-[220px] w-full min-w-0 overflow-hidden sm:h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueByDay}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: isMobile ? 10 : 12 }}
                interval={isMobile ? 1 : 0}
              />
              <YAxis
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: isMobile ? 10 : 12 }}
                width={isMobile ? 28 : 40}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#10B981"
                strokeWidth={3}
                fill="url(#colorRevenue)"
                name={t("admin.revenueSeriesName")}
              />
            </AreaChart>
          </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="min-w-0 overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-blue-500" />
            {t("admin.ordersByStatus")}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-4 sm:px-6">
          <div className="h-[220px] w-full min-w-0 overflow-hidden sm:h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusChartData}
                cx="50%"
                cy="50%"
                innerRadius={isMobile ? 42 : 60}
                outerRadius={isMobile ? 76 : 100}
                paddingAngle={isMobile ? 3 : 5}
                dataKey="value"
                label={isMobile ? false : (entry) => `${entry.name}: ${entry.value}`}
                labelLine={!isMobile}
              >
                {statusChartData.map((entry, index) => (
                  <Cell
                    key={`status-cell-${index}`}
                    fill={
                      entry.name === "pending"
                        ? "#F59E0B"
                        : entry.name === "processing"
                          ? "#3B82F6"
                          : entry.name === "shipped"
                            ? "#8B5CF6"
                            : entry.name === "delivered"
                              ? "#10B981"
                              : entry.name === "cancelled"
                                ? "#EF4444"
                                : CATEGORY_COLORS[index % CATEGORY_COLORS.length]
                    }
                    stroke="#fff"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                itemStyle={{ color: "hsl(var(--foreground))" }}
              />
              {!isMobile && <Legend wrapperStyle={{ paddingTop: "20px" }} iconType="circle" />}
            </PieChart>
          </ResponsiveContainer>
          </div>
          {isMobile && mobileStatusSummary.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {mobileStatusSummary.map((entry, index) => (
                <div key={`status-chip-${index}`} className="rounded-lg border border-border/70 bg-muted/30 px-2 py-1.5 text-xs">
                  <p className="capitalize text-muted-foreground">{entry.name}</p>
                  <p className="font-semibold">{entry.value}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="min-w-0 overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-purple-500" />
            {t("admin.productsByCategory")}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-4 sm:px-6">
          <div className="h-[240px] w-full min-w-0 overflow-hidden sm:h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categoryChartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: isMobile ? 10 : 12 }} />
              <YAxis
                dataKey="name"
                type="category"
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: isMobile ? 10 : 12 }}
                width={isMobile ? 72 : 100}
                tickFormatter={(value: string) => (isMobile ? truncateLabel(String(value), 9) : truncateLabel(String(value), 16))}
              />
              <Tooltip />
              <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                {categoryChartData.map((entry, index) => (
                  <Cell key={`category-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="min-w-0 overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-orange-500" />
            {t("admin.userRolesDistribution")}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-4 sm:px-6">
          <div className="h-[220px] w-full min-w-0 overflow-hidden sm:h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={roleChartData}
                cx="50%"
                cy="50%"
                outerRadius={isMobile ? 80 : 100}
                paddingAngle={isMobile ? 3 : 5}
                dataKey="value"
                label={isMobile ? false : (entry) => `${entry.name}: ${entry.value}`}
                labelLine={!isMobile}
              >
                {roleChartData.map((entry, index) => (
                  <Cell
                    key={`role-cell-${index}`}
                    fill={
                      entry.name === "admin"
                        ? "#EF4444"
                        : entry.name === "seller"
                          ? "#10B981"
                          : entry.name === "customer"
                            ? "#3B82F6"
                            : CATEGORY_COLORS[index % CATEGORY_COLORS.length]
                    }
                    stroke="#fff"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                itemStyle={{ color: "hsl(var(--foreground))" }}
              />
              {!isMobile && <Legend wrapperStyle={{ paddingTop: "20px" }} iconType="circle" />}
            </PieChart>
          </ResponsiveContainer>
          </div>
          {isMobile && mobileRoleSummary.length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {mobileRoleSummary.map((entry, index) => (
                <div key={`role-chip-${index}`} className="rounded-lg border border-border/70 bg-muted/30 px-2 py-1.5 text-center text-xs">
                  <p className="capitalize text-muted-foreground">{entry.name}</p>
                  <p className="font-semibold">{entry.value}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="col-span-full">
        <AdminTabsContent
          users={users}
          products={products}
          categories={categories}
          orders={orders}
          returns={returns}
          moderationQueue={moderationQueue}
        />
      </div>
    </div>
  )
}
