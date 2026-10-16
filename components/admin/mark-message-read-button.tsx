"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { CheckCheck, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { usePlatformPreferences } from "@/components/providers/platform-preferences-provider"

type Props = {
  messageId: string
}

export function MarkMessageReadButton({ messageId }: Props) {
  const { t } = usePlatformPreferences()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isDone, setIsDone] = useState(false)

  const handleMarkRead = async () => {
    try {
      const response = await fetch(`/api/admin/contact-messages/${messageId}`, {
        method: "PATCH",
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        toast.error(payload?.error || t("admin.failedToMarkMessageRead"))
        return
      }

      setIsDone(true)
      toast.success(t("admin.messageMarkedAsRead"))
      window.dispatchEvent(new CustomEvent("admin-contact-messages-updated"))
      startTransition(() => {
        router.refresh()
      })
    } catch {
      toast.error(t("admin.failedToMarkMessageRead"))
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleMarkRead} disabled={isPending || isDone}>
      {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCheck className="mr-2 h-4 w-4" />}
      {isDone ? t("admin.marked") : t("admin.markAsReadBtn")}
    </Button>
  )
}
