import Image from "next/image"
import type React from "react"
import Link from "next/link"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-20 items-center justify-center">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg transition-transform group-hover:scale-110 overflow-hidden">
              <Image src="/shega-mart-logo.png" alt="Shega Mart" width={40} height={40} className="object-cover" priority />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight text-primary">
                SHEGA MART
              </span>
              <span className="text-xs font-semibold text-accent tracking-widest">
                SHOP WITH JOY
              </span>
            </div>
          </Link>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  )
}
