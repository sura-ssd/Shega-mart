import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { formatDistanceToNow } from "date-fns"
import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { RotateCcw, CheckCircle, XCircle, Clock } from "lucide-react"
import { formatPrice } from "@/lib/currency"
import { getServerPlatformPreferences } from "@/lib/platform-preferences-server"
import { translate } from "@/lib/platform-preferences"

function ReturnsLoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="animate-pulse">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-6 w-20" />
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  )
}

async function ReturnsContent() {
  const supabase = await createClient()
  const preferences = await getServerPlatformPreferences()
  const tr = (key: Parameters<typeof translate>[1], vars?: Record<string, string | number>) => translate(preferences.language, key, vars)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: returns, error } = await supabase
    .from("returns")
    .select("*")
    .eq("customer_id", user.id)
    .order("requested_at", { ascending: false })

  if (error) {
    console.error("[v0] Error fetching returns:", error)
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      requested: { label: tr("account.statusPendingReview"), variant: "outline" as const, icon: Clock },
      approved: { label: tr("account.statusApproved"), variant: "default" as const, icon: CheckCircle },
      rejected: { label: tr("account.statusRejected"), variant: "destructive" as const, icon: XCircle },
      refunded: { label: tr("account.statusRefunded"), variant: "default" as const, icon: CheckCircle },
    }
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.requested
    const Icon = config.icon
    return (
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        <Badge variant={config.variant}>{config.label}</Badge>
      </div>
    )
  }

  if (!returns || returns.length === 0) {
    return (
      <Card>
        <CardContent className="flex min-h-[300px] items-center justify-center">
          <div className="text-center">
            <RotateCcw className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium">{tr("account.noReturnsTitle")}</p>
            <p className="text-sm text-muted-foreground mt-1">{tr("account.noReturnsSubtitle")}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {returns.map((returnRequest: any) => (
        <Card key={returnRequest.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <RotateCcw className="h-5 w-5" />
                {tr("account.orderNumber")}{returnRequest.order_id.slice(0, 8)}
              </CardTitle>
              {getStatusBadge(returnRequest.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{tr("account.reasonLabel")}</span>
                <span className="font-medium capitalize">{returnRequest.reason}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{tr("account.requestedLabel")}</span>
                <span>
                  {formatDistanceToNow(new Date(returnRequest.requested_at), {
                    addSuffix: true,
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{tr("account.refundAmountLabel")}</span>
                <span className="font-medium">{formatPrice(returnRequest.refund_amount)}</span>
              </div>
            </div>

            {returnRequest.description && (
              <div className="text-sm p-3 rounded-lg bg-muted">
                <p className="font-medium mb-1">{tr("account.descriptionLabel")}</p>
                <p className="text-muted-foreground">{returnRequest.description}</p>
              </div>
            )}

            {returnRequest.status === "approved" && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  {tr("account.returnApprovedNotice", { method: returnRequest.refund_method })}
                </AlertDescription>
              </Alert>
            )}

            {returnRequest.status === "rejected" && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  {tr("account.returnRejectedNotice")}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default async function ReturnsPage() {
  const preferences = await getServerPlatformPreferences()
  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{translate(preferences.language, "account.returnsTitle")}</h1>
        <p className="text-muted-foreground mt-2">{translate(preferences.language, "account.returnsSubtitle")}</p>
      </div>
      <Suspense fallback={<ReturnsLoadingSkeleton />}>
        <ReturnsContent />
      </Suspense>
    </div>
  )
}
