import type React from "react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_-5%,color-mix(in_oklch,var(--primary)_18%,transparent)_0%,transparent_42%),radial-gradient(circle_at_85%_0%,color-mix(in_oklch,var(--accent)_20%,transparent)_0%,transparent_46%)]" />
      <SiteHeader />
      <main className="flex-1 pb-10">{children}</main>
      <SiteFooter />
    </div>
  )
}
