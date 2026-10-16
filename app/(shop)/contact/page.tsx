import { ContactForm } from "@/components/contact/contact-form"
import { Card, CardContent } from "@/components/ui/card"
import { Mail, MessageSquare, Phone } from "lucide-react"
import { getServerPlatformPreferences } from "@/lib/platform-preferences-server"
import { translate } from "@/lib/platform-preferences"

export default async function ContactPage() {
  const preferences = await getServerPlatformPreferences()
  const tr = (key: Parameters<typeof translate>[1]) => translate(preferences.language, key)
  return (
    <div className="container py-8 md:py-12">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1.1fr_1.4fr]">
        <Card className="border-border/70 bg-gradient-to-b from-card to-muted/25 shadow-xl shadow-primary/5">
          <CardContent className="space-y-5 p-6 md:p-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{tr("contact.title")}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {tr("contact.subtitle")}
              </p>
            </div>

            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-3 rounded-lg border border-border/70 bg-background/70 p-3">
                <Mail className="mt-0.5 h-4 w-4 text-primary" />
                <div>
                  <p className="font-medium">{tr("contact.emailLabel")}</p>
                  <p className="text-muted-foreground">support@shegamart.com</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-lg border border-border/70 bg-background/70 p-3">
                <Phone className="mt-0.5 h-4 w-4 text-primary" />
                <div>
                  <p className="font-medium">{tr("contact.phoneLabel")}</p>
                  <p className="text-muted-foreground">+251 11 544 544</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-lg border border-border/70 bg-background/70 p-3">
                <MessageSquare className="mt-0.5 h-4 w-4 text-primary" />
                <div>
                  <p className="font-medium">{tr("contact.responseTime")}</p>
                  <p className="text-muted-foreground">{tr("contact.responseTimeValue")}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <ContactForm />
      </div>
    </div>
  )
}
