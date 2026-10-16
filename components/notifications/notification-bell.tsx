"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Bell, AlertCircle, CheckCircle2, Package, Clock, TrendingUp, X, ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import Link from "next/link"
import { usePlatformPreferences } from "@/components/providers/platform-preferences-provider"

interface Notification {
  id: string
  user_id: string
  type:
    | "order_expired_customer"
    | "order_expired_seller"
    | "order_placed_customer"
    | "order_placed_seller"
    | "order_delivered_customer"
    | "return_requested"
    | "return_approved"
    | "return_rejected"
    | "product_created"
    | "low_stock_alert"
    | "product_moderation_approved"
    | "product_moderation_rejected"
    | "cart_recovery"
  title: string
  message: string
  order_id?: string
  is_read: boolean
  created_at: string
}

export function NotificationBell({ userId }: { userId: string | null }) {
  const { t } = usePlatformPreferences()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [notificationToDelete, setNotificationToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null
    let poller: ReturnType<typeof setInterval> | null = null
    let isActive = true

    const fetchNotifications = async () => {
      if (!userId) {
        if (isActive) {
          setNotifications([])
          setUnreadCount(0)
          setIsLoading(false)
        }
        return
      }

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5)

      if (!error && isActive) {
        setNotifications(data || [])
        setUnreadCount((data || []).filter((n) => !n.is_read).length)
      }

      if (isActive) {
        setIsLoading(false)
      }
    }

    const init = async () => {
      if (!userId) {
        setIsLoading(false)
        return
      }

      await fetchNotifications()

      // Subscribe to real-time changes only after user is known
      const channelName = `notifications:${userId}:bell:${Date.now()}:${Math.random().toString(36).slice(2)}`
      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const newNotif = payload.new as Notification
            setNotifications((prev) => [newNotif, ...prev.slice(0, 4)])
            if (!newNotif.is_read) {
              setUnreadCount((prev) => prev + 1)
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const updatedNotif = payload.new as Notification
            setNotifications((prev) =>
              prev.map((n) => (n.id === updatedNotif.id ? updatedNotif : n))
            )
            if (payload.old.is_read === false && updatedNotif.is_read === true) {
              setUnreadCount((prev) => Math.max(0, prev - 1))
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const deletedId = payload.old.id
            const wasUnread = !payload.old.is_read
            setNotifications((prev) => prev.filter((n) => n.id !== deletedId))
            if (wasUnread) {
              setUnreadCount((prev) => Math.max(0, prev - 1))
            }
          }
        )
        .subscribe()

      // Fallback for environments where realtime delivery is unavailable.
      poller = setInterval(() => {
        void fetchNotifications()
      }, 5000)

      const handleFocus = () => {
        void fetchNotifications()
      }

      window.addEventListener("focus", handleFocus)
      document.addEventListener("visibilitychange", handleFocus)

      return () => {
        window.removeEventListener("focus", handleFocus)
        document.removeEventListener("visibilitychange", handleFocus)
      }
    }

    let cleanupFocusHandlers: (() => void) | undefined
    void init().then((cleanup) => {
      cleanupFocusHandlers = cleanup
    })

    return () => {
      isActive = false
      if (channel) {
        channel.unsubscribe()
      }
      if (poller) {
        clearInterval(poller)
      }
      if (cleanupFocusHandlers) {
        cleanupFocusHandlers()
      }
    }
  }, [supabase, userId])

  const handleDismiss = (notificationId: string) => {
    setNotificationToDelete(notificationId)
    setDeleteDialogOpen(true)
  }

  const handleMarkAsRead = async (notificationId: string) => {
    const target = notifications.find((n) => n.id === notificationId)
    if (!target || target.is_read) {
      return
    }

    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
    )
    setUnreadCount((prev) => Math.max(0, prev - 1))

    try {
      const res = await fetch(`/api/notifications/${notificationId}/read`, {
        method: "PATCH",
      })

      if (!res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, is_read: false } : n))
        )
        setUnreadCount((prev) => prev + 1)
      }
    } catch {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: false } : n))
      )
      setUnreadCount((prev) => prev + 1)
    }
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

      if (!res.ok) {
        let errorMsg = `Delete failed (${res.status})`
        try {
          const errorData = await res.json()
          errorMsg = errorData.error || errorMsg
          console.error("[v0] Delete error:", { status: res.status, error: errorMsg, details: errorData })
        } catch {
          console.error("[v0] Delete error:", { status: res.status, statusText: res.statusText })
        }
        return
      }
      
      // Success - remove from local state
      setNotifications((prev) => prev.filter((n) => n.id !== notificationToDelete))
      
      // Update unread count
      const deletedNotif = notifications.find((n) => n.id === notificationToDelete)
      if (deletedNotif && !deletedNotif.is_read) {
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error("[v0] Network error in delete:", error instanceof Error ? error.message : String(error))
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setNotificationToDelete(null)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "order_expired_customer":
      case "order_expired_seller":
        return <AlertCircle className="h-4 w-4 text-destructive" />
      case "order_placed_customer":
      case "order_placed_seller":
        return <Package className="h-4 w-4 text-green-500" />
      case "order_delivered_customer":
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      case "return_requested":
        return <Clock className="h-4 w-4 text-blue-500" />
      case "return_approved":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case "return_rejected":
        return <AlertCircle className="h-4 w-4 text-amber-500" />
      case "product_created":
        return <TrendingUp className="h-4 w-4 text-purple-500" />
      case "low_stock_alert":
        return <AlertCircle className="h-4 w-4 text-amber-500" />
      case "product_moderation_approved":
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      case "product_moderation_rejected":
        return <AlertCircle className="h-4 w-4 text-destructive" />
      case "cart_recovery":
        return <ShoppingCart className="h-4 w-4 text-blue-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0 relative hover:bg-primary/10 transition-colors"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge className="absolute -right-2 -top-2 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center bg-destructive text-white animate-scale-in">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
          <span className="sr-only">{t("notifBell.notificationsSr")}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 shadow-lg" align="end">
        <div className="border-b border-border/40 p-4">
          <h3 className="font-semibold">{t("header.notifications")}</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {unreadCount > 0 ? t("notifBell.unreadCount", { count: unreadCount }) : t("notifBell.allCaughtUp")}
          </p>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-6 text-center">
              <AlertCircle className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{t("notifBell.noneYet")}</p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 hover:bg-muted/50 transition-colors ${
                    !notification.is_read ? "bg-accent/20" : ""
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-1 flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{notification.title}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground/60 mt-1">
                        {new Date(notification.created_at).toLocaleDateString()}
                      </p>
                      {!notification.is_read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 mt-1 text-xs"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            void handleMarkAsRead(notification.id)
                          }}
                        >
                          {t("notifBell.markAsRead")}
                        </Button>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 flex-shrink-0 hover:bg-destructive/20 hover:text-destructive transition-colors"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleDismiss(notification.id)
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {notifications.length > 0 && (
          <div className="border-t border-border/40 p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              asChild
              onClick={() => setIsOpen(false)}
            >
              <Link href="/account/notifications">{t("notifBell.viewAll")}</Link>
            </Button>
          </div>
        )}
      </PopoverContent>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>{t("notifBell.deleteTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("notifBell.deleteConfirm")}
          </AlertDialogDescription>
          <div className="flex justify-end gap-3">
            <AlertDialogCancel>{t("notifBell.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? t("notifBell.deleting") : t("notifBell.delete")}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </Popover>
  )
}
