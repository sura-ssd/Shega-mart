import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { NotificationsClient } from "./notifications-client"

export const metadata = {
  title: "Notifications",
  description: "View all your notifications",
}

export default async function NotificationsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  let notifications = null

  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching notifications:", error)
      notifications = []
    } else {
      notifications = data || []
    }
  } catch (err) {
    console.error("[v0] Exception fetching notifications:", err)
    notifications = []
  }

  return <NotificationsClient notifications={notifications || []} />
}
