import Link from "next/link"

import { createClient } from "@/lib/supabase/server"
import { Card, CardContent } from "@/components/ui/card"
import { getServerPlatformPreferences } from "@/lib/platform-preferences-server"
import { translate } from "@/lib/platform-preferences"

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams?: Promise<{ search?: string }>
}) {
  const supabase = await createClient()
  const preferences = await getServerPlatformPreferences()
  const tr = (key: Parameters<typeof translate>[1]) => translate(preferences.language, key)
  const resolvedSearchParams = await searchParams
  const search = resolvedSearchParams?.search?.trim() || ""

  let query = supabase
    .from("categories")
    .select("id, name, slug, description, image_url")
    .order("created_at", { ascending: false })

  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
  }

  const { data: categories } = await query

  const allCategories = categories || []

  return (
    <div className="mx-auto w-full max-w-7xl px-3 py-6 sm:px-6 sm:py-12 lg:px-8">
      <div className="mb-5 sm:mb-8">
        <p className="text-xs uppercase tracking-[0.16em] text-primary">{tr("home.collections")}</p>
        <h1 className="mt-1.5 text-2xl font-bold sm:mt-2 sm:text-4xl">{tr("categories.allCategoriesTitle")}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground sm:mt-2">
          {tr("categories.exploreSubtitle")}
        </p>
        {search ? <p className="mt-3 text-sm text-muted-foreground">{tr("products.searchResultsFor")} "{search}"</p> : null}
      </div>

      {allCategories.length > 0 ? (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {allCategories.map((category) => (
            <Link key={category.id} href={`/categories/${category.slug}`} className="group">
              <Card className="h-full overflow-hidden border-border/70">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img
                    src={category.image_url || `/placeholder.svg?height=500&width=700&query=${category.name}`}
                    alt={category.name}
                    className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-110"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-2.5 sm:p-4">
                    <p className="line-clamp-1 text-sm font-semibold text-white sm:text-lg">{category.name}</p>
                  </div>
                </div>
                <CardContent className="p-2.5 sm:p-4">
                  <p className="line-clamp-2 text-[11px] leading-snug text-muted-foreground sm:text-sm">{category.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="rounded-2xl border-dashed">
          <CardContent className="py-16 text-center">
            <p className="text-lg font-semibold">{tr("categories.noneTitle")}</p>
            <p className="mt-2 text-sm text-muted-foreground">{tr("categories.noneSubtitle")}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
