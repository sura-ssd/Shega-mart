"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, X, CheckCircle2, Package, Clock, TrendingUp, ShoppingCart } from "lucide-react"

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

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null
    let poller: ReturnType<typeof setInterval> | null = null

    const fetchNotifications = async (userId?: string) => {
      let activeUserId = userId

      if (!activeUserId) {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          setIsLoading(false)
          return
        }

        activeUserId = user.id
      }

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", activeUserId)
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(5)

      if (!error && data) {
        setNotifications(data)
      }
      setIsLoading(false)
    }

    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setIsLoading(false)
        return
      }

      await fetchNotifications(user.id)

      // Subscribe to real-time notifications only after user is known
      const channelName = `notifications:${user.id}:center:${Date.now()}:${Math.random().toString(36).slice(2)}`
      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newNotif = payload.new as Notification
            if (newNotif.user_id === user.id && !newNotif.is_read) {
              setNotifications((prev) => [newNotif, ...prev])
            }
          }
        )
        .subscribe()

      // Fallback for environments where realtime delivery is unavailable.
      poller = setInterval(() => {
        void fetchNotifications(user.id)
      }, 5000)

      const handleFocus = () => {
        void fetchNotifications(user.id)
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
  }, [supabase])

  const handleDismiss = async (notificationId: string) => {
    try {
      // Use API endpoint to mark as read (more reliable than direct client update with RLS)
      const res = await fetch(`/api/notifications/${notificationId}/read`, {
        method: "PATCH",
      })

      if (res.ok) {
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
      }
    } catch (error) {
      // Error is handled silently - notification remains in list for retry
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "order_expired_customer":
      case "order_expired_seller":
        return <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
      case "order_placed_customer":
      case "order_placed_seller":
        return <Package className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
      case "order_delivered_customer":
        return <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5 flex-shrink-0" />
      case "return_requested":
        return <Clock className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
      case "return_approved":
        return <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
      case "return_rejected":
        return <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
      case "product_created":
        return <TrendingUp className="h-5 w-5 text-purple-500 mt-0.5 flex-shrink-0" />
      case "low_stock_alert":
        return <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
      case "product_moderation_approved":
        return <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5 flex-shrink-0" />
      case "product_moderation_rejected":
        return <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
      case "cart_recovery":
        return <ShoppingCart className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
      default:
        return <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
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

  if (isLoading || notifications.length === 0) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 w-full max-w-md space-y-2 z-50">
      {notifications.map((notification) => (
        <Card
          key={notification.id}
          className={`border-l-4 ${getBorderColor(notification.type)} bg-background shadow-lg hover:shadow-xl transition-shadow`}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1">
                {getNotificationIcon(notification.type)}
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base">{notification.title}</CardTitle>
                  <CardDescription className="text-sm mt-1 line-clamp-2">{notification.message}</CardDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 flex-shrink-0"
                onClick={() => handleDismiss(notification.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  )
}
