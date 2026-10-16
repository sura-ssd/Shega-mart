import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function WelcomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get user profile to determine redirect
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (profile?.role === "admin") {
    redirect("/admin")
  } else if (profile?.role === "seller") {
    redirect("/seller")
  } else {
    redirect("/")
  }
}
