import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ProductForm } from "@/components/seller/product-form"
import { getServerPlatformPreferences } from "@/lib/platform-preferences-server"
import { translate } from "@/lib/platform-preferences"

export default async function NewProductPage() {
  const supabase = await createClient()
  const preferences = await getServerPlatformPreferences()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (profile?.role !== "seller" && profile?.role !== "admin") {
    redirect("/")
  }

  const { data: categories } = await supabase.from("categories").select("*")

  return (
    <div className="container max-w-2xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{translate(preferences.language, "seller.addNewProduct")}</h1>
        <p className="text-muted-foreground">{translate(preferences.language, "seller.addNewProductSubtitle")}</p>
      </div>
      <ProductForm categories={categories || []} />
    </div>
  )
}
