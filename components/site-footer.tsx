"use client"

import Image from "next/image"
import Link from "next/link"
import { Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin } from "lucide-react"
import { usePlatformPreferences } from "@/components/providers/platform-preferences-provider"

export function SiteFooter() {
  const currentYear = new Date().getFullYear()
  const { t } = usePlatformPreferences()

  return (
    <footer className="border-t border-primary/10 bg-gradient-to-b from-background to-muted/30 backdrop-blur-sm">
      {/* Main Footer Content */}
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <div className="grid gap-12 md:grid-cols-4 sm:grid-cols-2">
          {/* Brand Section */}
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center gap-2">
              <Image src="/shega-mart-logo.png" alt="Shega Mart" width={32} height={32} className="object-cover" priority />
              <h3 className="text-2xl font-bold text-primary">
                SHEGA MART
              </h3>
            </div>
            <p className="text-xs font-semibold text-accent tracking-widest mb-2">SHOP WITH JOY</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("footer.tagline")}
            </p>
            <div className="flex gap-4 pt-4">
              <a href="#" className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors duration-300">
                <Facebook className="h-5 w-5 text-primary" />
              </a>
              <a href="#" className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors duration-300">
                <Twitter className="h-5 w-5 text-primary" />
              </a>
              <a href="#" className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors duration-300">
                <Instagram className="h-5 w-5 text-primary" />
              </a>
              <a href="#" className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors duration-300">
                <Linkedin className="h-5 w-5 text-primary" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <h4 className="font-semibold text-foreground">{t("footer.quickLinks")}</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors duration-300"
                >
                  {t("footer.home")}
                </Link>
              </li>
              <li>
                <Link
                  href="/#categories"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors duration-300"
                >
                  {t("footer.categories")}
                </Link>
              </li>
              <li>
                <Link
                  href="/account"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors duration-300"
                >
                  {t("footer.myAccount")}
                </Link>
              </li>
              <li>
                <Link
                  href="/cart"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors duration-300"
                >
                  {t("footer.shoppingCart")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Service */}
          <div className="space-y-4 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <h4 className="font-semibold text-foreground">{t("footer.customerService")}</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/contact" className="text-sm text-muted-foreground hover:text-primary transition-colors duration-300">
                  {t("footer.contactUs")}
                </Link>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors duration-300">
                  {t("footer.shippingInfo")}
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors duration-300">
                  {t("footer.returnsExchanges")}
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors duration-300">
                  {t("footer.faq")}
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-4 animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <h4 className="font-semibold text-foreground">{t("footer.contactInfo")}</h4>
            <ul className="space-y-3">
              <li className="flex gap-3 items-start">
                <Phone className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm text-muted-foreground">+251 11 544 544</span>
              </li>
              <li className="flex gap-3 items-start">
                <Mail className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                <span className="text-sm text-muted-foreground">support@shegamart.com</span>
              </li>
              <li className="flex gap-3 items-start">
                <MapPin className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm text-muted-foreground">123 Adwa Street, Piassa, AA 94025</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-primary/10" />

      {/* Bottom Footer */}
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">© {currentYear} Shega Mart. {t("footer.rights")}</p>
          <div className="flex gap-6">
            <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors duration-300">
              {t("footer.privacyPolicy")}
            </a>
            <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors duration-300">
              {t("footer.termsOfService")}
            </a>
            <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors duration-300">
              {t("footer.cookiePolicy")}
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
