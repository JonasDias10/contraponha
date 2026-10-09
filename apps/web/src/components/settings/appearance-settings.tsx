"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { errorMessage, queryKeys } from "@contraponha/client-core"

import { LocaleSwitcher, ThemeSwitcher } from "@/components/layout/preference-switchers"
import { useApi, useI18n, useViewer } from "@contraponha/web-ui"
import { SettingsSection } from "@/components/settings/settings-section"

const TIME_ZONES = Intl.supportedValuesOf("timeZone").filter((zone) => zone.startsWith("America/"))

export function AppearanceSettings(): React.JSX.Element {
  const { t } = useI18n()
  const api = useApi()
  const viewer = useViewer()
  const queryClient = useQueryClient()

  const saveTimezone = useMutation({
    mutationFn: (timezone: string) => api.users.updateMe({ timezone }),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.me, updated)

      toast.success(t("web.settings.profileSaved"))
    },
    onError: (error) => toast.error(errorMessage({ error, t })),
  })

  return (
    <SettingsSection title={t("web.settings.appearanceTitle")}>
      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold">{t("web.settings.theme")}</span>
        <ThemeSwitcher />
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold">{t("web.settings.language")}</span>
        <LocaleSwitcher />
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold">{t("web.settings.timezone")}</span>
        <select
          value={viewer?.timezone}
          onChange={(event) => saveTimezone.mutate(event.target.value)}
          className="h-11 max-w-sm rounded-md border border-line-strong bg-surface-raised px-3 text-[15px]"
        >
          {TIME_ZONES.map((zone) => (
            <option key={zone} value={zone}>
              {zone.replace("America/", "").replaceAll("_", " ")}
            </option>
          ))}
        </select>
        <span className="text-[13px] text-subtle">{t("web.settings.timezoneHint")}</span>
      </label>
    </SettingsSection>
  )
}
