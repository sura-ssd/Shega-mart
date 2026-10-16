"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { AlertCircle, CheckCircle2, Package, Clock, TrendingUp, Trash2 } from "lucide-react"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { usePlatformPreferences } from "@/components/providers/platform-preferences-provider"

interface Notification {
  id: string
  title: string
  message: string
  type: string
  is_read: boolean
  created_at: string
  order_id?: string
}

interface NotificationsClientProps {
  notifications: Notification[] | null
}

export function NotificationsClient({ notifications }: NotificationsClientProps) {
  const { t } = usePlatformPreferences()
  const [displayedNotifications, setDisplayedNotifications] = useState<Notification[]>(notifications || [])
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [notificationToDelete, setNotificationToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  const formatDateKey = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  const isSameDay = (firstDate: Date, secondDate: Date) =>
    formatDateKey(firstDate) === formatDateKey(secondDate)

  const notificationDates = useMemo(
    () => new Set((notifications || []).map((notification) => formatDateKey(new Date(notification.created_at)))),
    [notifications],
  )

  const filteredNotifications = useMemo(
    () =>
      [...displayedNotifications]
        .filter((notification) => isSameDay(new Date(notification.created_at), selectedDate))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [displayedNotifications, selectedDate],
  )

  const selectedDateLabel = isSameDay(selectedDate, new Date())
    ? t("notifications.today") || "Today"
    : selectedDate.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })

  const handleDeleteClick = (notificationId: string) => {
    setNotificationToDelete(notificationId)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!notificationToDelete) return

    setIsDeleting(true)
    try {
      const res = await fetch(`/api/notifications/${notificationToDelete}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (res.ok) {
        setDisplayedNotifications((prev) => 
          prev.filter((n) => n.id !== notificationToDelete)
        )
      } else {
        // Log detailed error information for debugging
        const responseText = await res.text()
        let errorMsg = `Status ${res.status}`
        let errorDetails = null

        try {
          errorDetails = JSON.parse(responseText)
          errorMsg = errorDetails.error || errorMsg
        } catch {
          // Response was not JSON
          errorMsg = responseText || errorMsg
        }

        console.error("[v0] Delete notification failed:", {
          status: res.status,
          statusText: res.statusText,
          error: errorMsg,
          notificationId: notificationToDelete,
        })
      }
    } catch (error) {
      console.error("[v0] Network error in confirmDelete:", error instanceof Error ? error.message : String(error))
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setNotificationToDelete(null)
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case "order_expired_customer":
      case "order_expired_seller":
        return <AlertCircle className="h-5 w-5 text-destructive" />
      case "order_placed_customer":
      case "order_placed_seller":
        return <Package className="h-5 w-5 text-green-500" />
      case "order_delivered_customer":
        return <CheckCircle2 className="h-5 w-5 text-emerald-500" />
      case "return_requested":
        return <Clock className="h-5 w-5 text-blue-500" />
      case "return_approved":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case "return_rejected":
        return <AlertCircle className="h-5 w-5 text-amber-500" />
      case "product_created":
        return <TrendingUp className="h-5 w-5 text-purple-500" />
      case "low_stock_alert":
        return <AlertCircle className="h-5 w-5 text-amber-500" />
      case "product_moderation_approved":
        return <CheckCircle2 className="h-5 w-5 text-emerald-500" />
      case "product_moderation_rejected":
        return <AlertCircle className="h-5 w-5 text-destructive" />
      case "cart_recovery":
        return <Package className="h-5 w-5 text-blue-500" />
      default:
        return <AlertCircle className="h-5 w-5 text-muted-foreground" />
    }
  }

  const getBorderColor = (type: string) => {
    switch (type) {
      case "order_expired_customer":
      case "order_expired_seller":
        return "border-l-destructive"
      case "order_placed_customer":
      case "order_placed_seller":
        return "border-l-green-500"
      case "order_delivered_customer":
        return "border-l-emerald-500"
      case "return_requested":
        return "border-l-blue-500"
      case "return_approved":
        return "border-l-green-500"
      case "return_rejected":
        return "border-l-amber-500"
      case "product_created":
        return "border-l-purple-500"
      case "low_stock_alert":
        return "border-l-amber-500"
      case "product_moderation_approved":
        return "border-l-emerald-500"
      case "product_moderation_rejected":
        return "border-l-destructive"
      case "cart_recovery":
        return "border-l-blue-500"
      default:
        return "border-l-muted"
    }
  }

  const handleMarkAsRead = async (notificationId: string) => {
    const target = displayedNotifications.find((n) => n.id === notificationId)
    if (!target || target.is_read) {
      return
    }

    setDisplayedNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
    )

    try {
      const res = await fetch(`/api/notifications/${notificationId}/read`, {
        method: "PATCH",
      })

      if (!res.ok) {
        setDisplayedNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, is_read: false } : n))
        )
      }
    } catch {
      setDisplayedNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: false } : n))
      )
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">{t("notifications.title")}</h1>
          <p className="mt-2 text-muted-foreground">{t("notifications.subtitle")}</p>
        </div>

        <div className="mb-6 rounded-2xl border border-border/80 bg-background/90 p-3 shadow-sm ring-1 ring-border/50 sm:p-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Selected date</p>
              <p className="text-base font-semibold text-foreground">{selectedDateLabel}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5 text-xs"
              onClick={() => setSelectedDate(new Date())}
            >
              Today
            </Button>
          </div>

          <div className="mx-auto w-full max-w-[270px] rounded-xl bg-card p-2 shadow-inner ring-1 ring-border/60">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                if (date) setSelectedDate(date)
              }}
              modifiers={{
                hasNotification: (date) => notificationDates.has(formatDateKey(date)),
              }}
              modifiersClassNames={{
                hasNotification:
                  "bg-emerald-100 text-emerald-900 hover:bg-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-200 dark:hover:bg-emerald-500/30",
              }}
              className="w-full [&_.rdp-months]:gap-2 [&_.rdp-month]:!w-full [&_.rdp-month_grid]:!w-full [&_.rdp-table]:!w-full [&_.rdp-button]:!h-8 [&_.rdp-button]:!w-8 [&_.rdp-button]:text-[11px]"
            />
          </div>
        </div>

        {!displayedNotifications || displayedNotifications.length === 0 ? (
          <Card>
            <CardContent className="flex min-h-[300px] items-center justify-center">
              <div className="text-center">
                <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
                <p className="text-muted-foreground text-lg">{t("notifications.noneTitle")}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("notifications.noneSubtitle")}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : filteredNotifications.length === 0 ? (
          <Card>
            <CardContent className="flex min-h-[220px] items-center justify-center">
              <div className="text-center">
                <AlertCircle className="mx-auto mb-4 h-10 w-10 text-muted-foreground opacity-60" />
                <p className="text-lg font-medium">No notifications for this date</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Choose another day from the calendar to view notifications.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">Notifications for {selectedDateLabel}</h2>
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                {filteredNotifications.length} item{filteredNotifications.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredNotifications.map((notification: Notification) => (
                <Card
                  key={notification.id}
                  className={`h-full border-l-4 shadow-sm transition-all ${getBorderColor(notification.type)} ${
                    !notification.is_read ? "bg-accent/15 ring-1 ring-primary/10" : "bg-background"
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <div className="mt-0.5 flex-shrink-0">{getIcon(notification.type)}</div>
                        <div className="min-w-0 flex-1">
                          <CardTitle className="line-clamp-2 text-base leading-6">{notification.title}</CardTitle>
                          <CardDescription className="mt-2 line-clamp-4 text-sm leading-6">
                            {notification.message}
                          </CardDescription>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 flex-shrink-0 rounded-full hover:bg-destructive/15 hover:text-destructive transition-colors"
                        onClick={() => handleDeleteClick(notification.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between gap-3 border-t pt-3">
                      <p className="text-xs text-muted-foreground">
                        {new Date(notification.created_at).toLocaleDateString()} {t("notifications.at")} {new Date(notification.created_at).toLocaleTimeString()}
                      </p>
                      {!notification.is_read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => handleMarkAsRead(notification.id)}
                        >
                          {t("notifications.markRead")}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogTitle>{t("notifications.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("notifications.deleteConfirm")}
            </AlertDialogDescription>
            <div className="flex justify-end gap-3">
              <AlertDialogCancel>{t("notifications.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                disabled={isDeleting}
                className="bg-destructive hover:bg-destructive/90"
              >
                {isDeleting ? t("notifications.deleting") : t("notifications.delete")}
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </main>
  )
}
