import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Mail, MessageSquare, UserRound } from "lucide-react"
import { MarkMessageReadButton } from "@/components/admin/mark-message-read-button"
import { getServerPlatformPreferences } from "@/lib/platform-preferences-server"
import { translate } from "@/lib/platform-preferences"

type ContactMessage = {
  id: string
  name: string
  email: string
  subject: string
  message: string
  status: "new" | "read" | "replied"
  created_at: string
}

function getBadgeVariant(status: ContactMessage["status"]) {
  if (status === "new") return "destructive"
  if (status === "replied") return "default"
  return "secondary"
}

export default async function AdminMessagesPage() {
  const supabase = await createClient()
  const preferences = await getServerPlatformPreferences()
  const tr = (key: Parameters<typeof translate>[1], vars?: Record<string, string | number>) => translate(preferences.language, key, vars)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (profile?.role !== "admin") {
    redirect("/")
  }

  const adminClient = createAdminClient()
  const { data: messages } = await adminClient
    .from("contact_messages")
    .select("id, name, email, subject, message, status, created_at")
    .order("created_at", { ascending: false })
    .limit(300)

  const messageStatusLabels: Record<ContactMessage["status"], string> = {
    new: tr("admin.msgStatusNew"),
    read: tr("admin.msgStatusRead"),
    replied: tr("admin.msgStatusReplied"),
  }

  return (
    <div className="container py-8 md:py-10">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{tr("admin.contactMessagesTitle")}</h1>
          <p className="text-sm text-muted-foreground">{tr("admin.contactMessagesSubtitle")}</p>
        </div>
        <Badge variant="outline" className="text-xs">
          {tr("admin.totalCount", { count: (messages || []).length })}
        </Badge>
      </div>

      <div className="space-y-4">
        {(messages || []).length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">{tr("admin.noMessagesYet")}</CardContent>
          </Card>
        ) : (
          (messages as ContactMessage[]).map((message) => (
            <Card key={message.id} className="border-border/70">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{message.subject}</CardTitle>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <UserRound className="h-3.5 w-3.5" />
                        {message.name}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5" />
                        {message.email}
                      </span>
                      <span>{new Date(message.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                  <Badge variant={getBadgeVariant(message.status)} className="capitalize">
                    {messageStatusLabels[message.status] || message.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-border/70 bg-muted/30 p-4 text-sm leading-relaxed text-foreground/90">
                  <p className="whitespace-pre-wrap">{message.message}</p>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <a
                    href={`mailto:${message.email}?subject=Re: ${encodeURIComponent(message.subject)}`}
                    className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                  >
                    <MessageSquare className="h-4 w-4" />
                    {tr("admin.replyByEmail")}
                  </a>
                  {message.status === "new" ? <MarkMessageReadButton messageId={message.id} /> : null}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
