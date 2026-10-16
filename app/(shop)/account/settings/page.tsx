"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Save, UserCircle2 } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { usePlatformPreferences } from "@/components/providers/platform-preferences-provider"

type ProfileState = {
  id: string
  full_name: string | null
  phone: string | null
  address: string | null
  role: "customer" | "seller" | "admin" | null
}

export default function AccountSettingsPage() {
  const router = useRouter()
  const { t } = usePlatformPreferences()
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [houseNumber, setHouseNumber] = useState("")
  const [street, setStreet] = useState("")
  const [city, setCity] = useState("")
  const [region, setRegion] = useState("")
  const [postalCode, setPostalCode] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const loadProfile = async () => {
      const supabase = createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.replace("/auth/login")
        return
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, phone, address, role")
        .eq("id", user.id)
        .single<ProfileState>()

      if (error) {
        toast.error(t("account.unableToLoadProfile"))
      }

      setFullName(data?.full_name || "")
      setPhone(data?.phone || "")

      const parsedAddress = (data?.address || "").split(",").map((part) => part.trim())
      setHouseNumber(parsedAddress[0] || "")
      setStreet(parsedAddress[1] || "")
      setCity(parsedAddress[2] || "")
      setRegion(parsedAddress[3] || "")
      setPostalCode(parsedAddress[4] || "")

      setRole(data?.role || "")
      setEmail(user.email || "")
      setIsLoading(false)
    }

    loadProfile()
  }, [router])

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const trimmedName = fullName.trim()
    if (!trimmedName) {
      toast.error(t("account.fullNameRequired"))
      return
    }

    setIsSaving(true)

    try {
      const supabase = createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.replace("/auth/login")
        return
      }

      const trimmedPhone = phone.trim()
      const trimmedAddress = [houseNumber, street, city, region, postalCode]
        .map((part) => part.trim())
        .filter(Boolean)
        .join(", ")

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: trimmedName,
          phone: trimmedPhone,
          address: trimmedAddress,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)

      if (error) throw error

      toast.success(t("account.profileUpdated"))
      router.refresh()
    } catch {
      toast.error(t("account.failedToUpdateProfile"))
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle>{t("account.settingsTitle")}</CardTitle>
            <CardDescription>{t("account.loadingProfile")}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCircle2 className="h-5 w-5" />
            {t("account.settingsTitle")}
          </CardTitle>
          <CardDescription>{t("account.updateProfileDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="fullName">{t("account.fullNameLabel")}</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t("account.fullNamePlaceholder")}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">{t("common.phone")}</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+251 9XX XXX XXX"
              />
            </div>

            <div className="space-y-3">
              <Label>{t("common.address")}</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="houseNumber" className="text-sm">House / apartment number</Label>
                  <Input
                    id="houseNumber"
                    value={houseNumber}
                    onChange={(e) => setHouseNumber(e.target.value)}
                    placeholder="House 12 / Apt 3"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="street" className="text-sm">Street</Label>
                  <Input
                    id="street"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder="Main street"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-sm">City</Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Addis Ababa"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="region" className="text-sm">Region</Label>
                  <Input
                    id="region"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    placeholder="Bole"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="postalCode" className="text-sm">Postal code</Label>
                  <Input
                    id="postalCode"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="1000"
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">{t("account.emailLabel")}</Label>
                <Input id="email" value={email} disabled readOnly />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">{t("account.roleLabel")}</Label>
                <Input id="role" value={role} disabled readOnly className="capitalize" />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => router.push("/account")}>
                {t("account.cancel")}
              </Button>
              <Button type="submit" disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? t("account.savingChanges") : t("account.saveChanges")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
