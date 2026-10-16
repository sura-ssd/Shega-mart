"use client"

import { Package } from "lucide-react"
import { useEffect, useState } from "react"
import { usePlatformPreferences } from "@/components/providers/platform-preferences-provider"

export function LoadingScreen() {
  const { t } = usePlatformPreferences()
  const [dots, setDots] = useState(1)

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev % 3) + 1)
    }, 500)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-6">
        {/* Animated Package Icon */}
        <div className="relative">
          {/* Outer glow ring */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary to-primary/60 opacity-20 blur-2xl animate-pulse" />

          {/* Main package container */}
          <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/60 shadow-2xl shadow-primary/50 animate-bounce">
            <Package className="h-12 w-12 text-primary-foreground animate-pulse" />
          </div>

          {/* Orbiting dots */}
          <div className="absolute -inset-4 animate-spin-slow">
            <div className="absolute top-0 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-primary animate-pulse" />
            <div className="absolute bottom-0 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-primary animate-pulse delay-700" />
            <div className="absolute left-0 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-primary animate-pulse delay-300" />
            <div className="absolute right-0 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-primary animate-pulse delay-500" />
          </div>
        </div>

        {/* Loading text */}
        <div className="text-center space-y-2">
          <h3 className="text-xl font-bold tracking-tight">{t("loadingScreen.title", { dots: ".".repeat(dots) })}</h3>
          <p className="text-sm text-muted-foreground">{t("loadingScreen.subtitle")}</p>
        </div>
      </div>
    </div>
  )
}
