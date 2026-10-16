import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import { CheckCircle2, Mail, AlertCircle, Settings } from "lucide-react"
import { getServerPlatformPreferences } from "@/lib/platform-preferences-server"
import { translate } from "@/lib/platform-preferences"

export default async function SignUpSuccessPage() {
  const preferences = await getServerPlatformPreferences()
  const tr = (key: Parameters<typeof translate>[1]) => translate(preferences.language, key)
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-6">
      <div className="w-full max-w-2xl space-y-6">
        <Card className="border-primary/20 shadow-2xl">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-10 w-10 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">{tr("auth.accountCreatedTitle")}</CardTitle>
            <CardDescription className="text-base">{tr("auth.accountCreatedDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertDescription>
                {tr("auth.confirmationEmailNotice")}
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <h3 className="font-semibold text-sm">{tr("auth.notReceivingEmail")}</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>{tr("auth.checkSpamBullet")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>{tr("auth.waitAFewMinutesBullet")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>{tr("auth.correctEmailBullet")}</span>
                </li>
              </ul>
            </div>

            <Alert className="border-amber-500/50 bg-amber-500/10">
              <Settings className="h-4 w-4 text-amber-600 dark:text-amber-500" />
              <AlertDescription className="text-amber-900 dark:text-amber-100">
                <strong className="block mb-1">For Development:</strong>
                If you're testing and don't want to use email confirmation, you can disable it in your Supabase
                dashboard:
                <br />
                <span className="text-xs mt-2 block">
                  Authentication → Providers → Email → Toggle OFF "Confirm email"
                </span>
              </AlertDescription>
            </Alert>

            <div className="flex flex-col gap-3">
              <Button asChild className="w-full">
                <Link href="/auth/login">{tr("auth.goToLogin")}</Link>
              </Button>
              <Button asChild variant="outline" className="w-full bg-transparent">
                <Link href="/auth/signup">{tr("auth.tryAgainDifferentEmail")}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-muted">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Email Configuration (For Admins)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Supabase's default email provider is for demonstration only and has rate limits. For production use:</p>
            <ol className="space-y-2 list-decimal list-inside">
              <li>Go to your Supabase project dashboard</li>
              <li>Navigate to Authentication → Email Templates</li>
              <li>Configure a custom SMTP provider (Gmail, SendGrid, etc.)</li>
              <li>Test the email configuration</li>
            </ol>
            <p className="text-xs pt-2">
              Learn more:{" "}
              <a
                href="https://supabase.com/docs/guides/auth/auth-smtp"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Supabase SMTP Documentation
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
