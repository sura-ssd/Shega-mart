import type React from "react"
import type { Metadata } from "next"
import { Sora, Space_Grotesk, Space_Mono } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "sonner"
import { AuthProtectionClient } from "@/components/ui/auth-protection-client"
import { PlatformPreferencesProvider } from "@/components/providers/platform-preferences-provider"
import NextTopLoader from "nextjs-toploader"

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
})

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
})

const spaceMono = Space_Mono({
  subsets: ["latin"],
  variable: "--font-space-mono",
  weight: ["400", "700"],
})

export const metadata: Metadata = {
  title: "Shega Mart - Shop with Joy",
  description: "Shop with joy! Discover authentic Ethiopian products and connect with local businesses on Shega Mart",
  icons: {
    icon: "/shega-mart-logo.png",
    shortcut: "/shega-mart-logo.png",
    apple: "/shega-mart-logo.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${sora.variable} ${spaceGrotesk.variable} ${spaceMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <NextTopLoader
            color="#16a34a"
            height={2}
            showSpinner={false}
            crawlSpeed={160}
            easing="ease"
            speed={220}
            shadow={false}
          />
          <PlatformPreferencesProvider>
            <AuthProtectionClient />
            {children}
            <Toaster richColors position="top-center" />
          </PlatformPreferencesProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
