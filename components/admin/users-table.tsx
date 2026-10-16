"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import type { Profile } from "@/lib/types"
import { usePlatformPreferences } from "@/components/providers/platform-preferences-provider"

function formatUtcDate(dateInput: string | null | undefined) {
  if (!dateInput) return "-"
  const date = new Date(dateInput)
  if (Number.isNaN(date.getTime())) return "-"

  const day = String(date.getUTCDate()).padStart(2, "0")
  const month = String(date.getUTCMonth() + 1).padStart(2, "0")
  const year = date.getUTCFullYear()
  return `${day}/${month}/${year}`
}

export function UsersTable({ users }: { users: Profile[] }) {
  const { t } = usePlatformPreferences()
  const roleLabels: Record<string, string> = {
    admin: t("admin.roleAdmin"),
    seller: t("admin.roleSeller"),
    customer: t("admin.roleCustomer"),
  }
  if (users.length === 0) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <p className="text-muted-foreground">{t("admin.noUsersFound")}</p>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("admin.colName")}</TableHead>
          <TableHead>{t("admin.colEmail")}</TableHead>
          <TableHead>{t("admin.colRole")}</TableHead>
          <TableHead>{t("admin.colJoined")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell className="font-medium">{user.full_name || t("admin.notApplicable")}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell>
              <Badge
                variant={user.role === "admin" ? "default" : user.role === "seller" ? "secondary" : "outline"}
                className="capitalize"
              >
                {roleLabels[user.role] || user.role}
              </Badge>
            </TableCell>
            <TableCell>{formatUtcDate(user.created_at)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
