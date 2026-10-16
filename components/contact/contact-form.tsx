"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Send } from "lucide-react"
import { toast } from "sonner"
import { usePlatformPreferences } from "@/components/providers/platform-preferences-provider"

type ContactFieldErrors = Partial<Record<"name" | "email" | "subject" | "message", string>>

export function ContactForm() {
  const { t } = usePlatformPreferences()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<ContactFieldErrors>({})

  const resetForm = () => {
    setName("")
    setEmail("")
    setSubject("")
    setMessage("")
  }

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFieldErrors({})
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, subject, message }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)

        const apiFieldErrors = payload?.details?.fieldErrors as
          | Record<string, string[]>
          | undefined

        if (apiFieldErrors) {
          const nextFieldErrors: ContactFieldErrors = {}

          if (apiFieldErrors.name?.[0]) nextFieldErrors.name = apiFieldErrors.name[0]
          if (apiFieldErrors.email?.[0]) nextFieldErrors.email = apiFieldErrors.email[0]
          if (apiFieldErrors.subject?.[0]) nextFieldErrors.subject = apiFieldErrors.subject[0]
          if (apiFieldErrors.message?.[0]) nextFieldErrors.message = apiFieldErrors.message[0]

          if (Object.keys(nextFieldErrors).length > 0) {
            setFieldErrors(nextFieldErrors)
            return
          }
        }

        const errorMessage = payload?.error || t("contact.couldNotSend")
        toast.error(errorMessage)
        return
      }

      toast.success(t("contact.messageSent"))
      resetForm()
    } catch {
      toast.error(t("contact.somethingWrong"))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="border-border/70 shadow-xl shadow-primary/5">
      <CardContent className="p-6 md:p-8">
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">{t("contact.fullName")}</Label>
              <Input
                id="name"
                value={name}
                onChange={(event) => {
                  setName(event.target.value)
                  if (fieldErrors.name) {
                    setFieldErrors((prev) => ({ ...prev, name: undefined }))
                  }
                }}
                placeholder={t("contact.fullNamePlaceholder")}
                required
                maxLength={80}
                aria-invalid={Boolean(fieldErrors.name)}
              />
              {fieldErrors.name ? <p className="text-xs text-destructive">{fieldErrors.name}</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t("contact.emailAddress")}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value)
                  if (fieldErrors.email) {
                    setFieldErrors((prev) => ({ ...prev, email: undefined }))
                  }
                }}
                placeholder={t("contact.emailPlaceholder")}
                required
                maxLength={120}
                aria-invalid={Boolean(fieldErrors.email)}
              />
              {fieldErrors.email ? <p className="text-xs text-destructive">{fieldErrors.email}</p> : null}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">{t("contact.subject")}</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(event) => {
                setSubject(event.target.value)
                if (fieldErrors.subject) {
                  setFieldErrors((prev) => ({ ...prev, subject: undefined }))
                }
              }}
              placeholder={t("contact.subjectPlaceholder")}
              required
              maxLength={120}
              aria-invalid={Boolean(fieldErrors.subject)}
            />
            {fieldErrors.subject ? <p className="text-xs text-destructive">{fieldErrors.subject}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">{t("contact.message")}</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(event) => {
                setMessage(event.target.value)
                if (fieldErrors.message) {
                  setFieldErrors((prev) => ({ ...prev, message: undefined }))
                }
              }}
              placeholder={t("contact.messagePlaceholder")}
              className="min-h-36"
              required
              maxLength={2000}
              aria-invalid={Boolean(fieldErrors.message)}
            />
            {fieldErrors.message ? <p className="text-xs text-destructive">{fieldErrors.message}</p> : null}
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">
            <Send className="mr-2 h-4 w-4" />
            {isSubmitting ? t("contact.sending") : t("contact.send")}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
