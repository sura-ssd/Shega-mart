import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { HeroCarousel } from "@/components/hero-carousel";
import { formatPriceForCurrency } from "@/lib/currency";
import { getServerPlatformPreferences } from "@/lib/platform-preferences-server";
import { translate } from "@/lib/platform-preferences";
import { createClient } from "@/lib/supabase/server";
import { ProductRatingBadge } from "@/components/products/product-rating-badge";
import { getProductRatingSummaries } from "@/lib/product-ratings";
import {
  getFeaturedProducts,
  getHomepageCategories,
} from "@/lib/homepage-data";

export default async function HomePage() {
  const [preferences, products, categories] = await Promise.all([
    getServerPlatformPreferences(),
    getFeaturedProducts(),
    getHomepageCategories(),
  ]);
  const supabase = await createClient();
  const ratingSummaries = await getProductRatingSummaries(supabase, (products || []).map((product) => product.id));

  const formatAmount = (value: number) =>
    formatPriceForCurrency(value, {
      currency: preferences.currency,
      locale: preferences.locale,
      rates: preferences.rates,
    });

  return (
    <div className="flex flex-col pb-16">
      <section className="relative overflow-hidden px-3 pt-4 sm:px-6 sm:pt-10 lg:px-8 lg:pt-14">
        <div className="mx-auto w-full max-w-7xl animate-fade-in">
          <HeroCarousel />
        </div>
      </section>

      {(categories || []).length > 0 && (
        <section
          id="categories"
          className="px-3 pt-10 sm:px-6 sm:pt-16 lg:px-8 lg:pt-24"
        >
          <div className="mx-auto w-full max-w-7xl">
            <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-primary">
                  {translate(preferences.language, "home.collections")}
                </p>
                <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
                  {translate(preferences.language, "home.shopByCategory")}
                </h2>
              </div>
              <Button variant="outline" asChild>
                <Link href="/categories">
                  {translate(preferences.language, "home.seeAllCategories")}
                </Link>
              </Button>
            </div>

            {/* MODIFIED: Changed grid-cols-1 to grid-cols-2 on small screens and optimized the gap spacing (gap-3) */}
            <div className="grid auto-rows-[132px] xs:auto-rows-[160px] sm:auto-rows-[220px] grid-cols-2 gap-2.5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
              {(categories || []).map((category, index) => (
                <Link
                  key={category.id}
                  href={`/categories/${category.slug}`}
                  className={`group relative overflow-hidden rounded-2xl border border-border/60 ${
                    index === 0
                      ? "col-span-2 xs:col-span-2 sm:col-span-2 sm:row-span-2"
                      : ""
                  } ${index === 3 ? "col-span-2 lg:col-span-2" : ""}`}
                >
                  <Image
                    src={
                      category.image_url ||
                      `/placeholder.svg?height=700&width=700&query=${encodeURIComponent(category.name)}`
                    }
                    alt={category.name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover transition duration-700 group-hover:scale-110"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

                  {/* MODIFIED: Optimized padding and layout text sizes for compact mobile columns */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-5">
                    <p className="text-base font-semibold text-white line-clamp-1 sm:text-lg">
                      {category.name}
                    </p>
                    <p className="mt-0.5 line-clamp-1 text-xs text-white/80 sm:mt-1 sm:line-clamp-2 sm:text-sm">
                      {category.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section id="products" className="px-3 pt-10 sm:px-6 sm:pt-16 lg:px-8 lg:pt-24">
        <div className="mx-auto w-full max-w-7xl">
          <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-primary">
                {translate(preferences.language, "home.trendingNow")}
              </p>
              <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
                {translate(preferences.language, "home.featuredProducts")}
              </h2>
            </div>
            <Button variant="outline" asChild>
              <Link href="/products">
                {translate(preferences.language, "home.browseCatalog")}
              </Link>
            </Button>
          </div>

          {products && products.length > 0 ? (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product, index) => (
                <Link
                  key={product.id}
                  href={`/products/${product.id}`}
                  className="group flex flex-col h-full"
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <Card className="flex flex-col h-full overflow-hidden border-border/70">
                    <div className="relative aspect-[4/3] overflow-hidden shrink-0">
                      <Image
                        src={
                          product.image_url ||
                          `/placeholder.svg?height=500&width=700&query=${encodeURIComponent(product.name)}`
                        }
                        alt={product.name}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 25vw"
                        className="object-cover transition duration-700 group-hover:scale-110"
                        loading="lazy"
                      />
                      {product.stock <= 0 && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/45 backdrop-blur-sm">
                          <span className="rounded-full border border-white/30 bg-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-white sm:px-3 sm:py-1 sm:text-xs">
                            {translate(preferences.language, "home.outOfStock")}
                          </span>
                        </div>
                      )}
                      {product.stock > 0 && product.stock <= 5 && (
                        <span className="absolute right-2 top-2 rounded-full bg-destructive px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-destructive-foreground sm:right-3 sm:top-3 sm:px-2.5 sm:py-1 sm:text-[10px]">
                          {product.stock} {translate(preferences.language, "home.leftInStock")}
                        </span>
                      )}
                    </div>

                    <CardContent className="flex flex-1 flex-col justify-between space-y-2 p-2.5 sm:p-4">
                      <div className="space-y-1">
                        <h3 className="line-clamp-1 text-sm font-semibold sm:text-base">
                          {product.name}
                        </h3>
                        <ProductRatingBadge summary={ratingSummaries[product.id]} className="text-xs" />
                        <p className="line-clamp-2 text-[11px] leading-snug text-muted-foreground sm:text-sm">
                          {product.description}
                        </p>
                      </div>

                      <div className="mt-auto flex flex-wrap items-end justify-between gap-1 border-t border-border/70 pt-2 shrink-0">
                        <span className="text-sm font-bold text-primary sm:text-lg">
                          {formatAmount(Number(product.price))}
                        </span>
                        <span className="text-[10px] sm:text-xs text-muted-foreground">
                          {product.stock > 0
                            ? `${product.stock} ${translate(preferences.language, "home.leftInStock")}`
                            : translate(preferences.language, "home.outOfStock")}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card className="rounded-2xl border-dashed">
              <CardContent className="py-16 text-center">
                <p className="text-lg font-semibold">
                  {translate(preferences.language, "home.noProductsTitle")}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {translate(preferences.language, "home.noProductsSubtitle")}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}
