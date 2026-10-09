"use client"

import {
  DIGEST_HOURS,
  formatDigestHour,
  NOTIFICATION_SWITCHES,
  toggleDigestHour,
} from "@contraponha/client-core"
import { useNotificationPreferences } from "@contraponha/client-core/react"

import { cn, Switch, useI18n, useViewer } from "@contraponha/web-ui"

export interface NotificationPreferencesFormProps {
  showDigest?: boolean
}

export function NotificationPreferencesForm({
  showDigest = true,
}: NotificationPreferencesFormProps): React.JSX.Element | null {
  const { t } = useI18n()
  const viewer = useViewer()
  const { preferences: data, save } = useNotificationPreferences()

  if (!data) return null

  const toggleHour = (hour: number): void => {
    save({ digestHours: toggleDigestHour({ hours: data.digestHours, hour }) })
  }

  return (
    <div className="flex flex-col gap-4">
      {NOTIFICATION_SWITCHES.map(({ key, label }) => (
        <label key={key} className="flex items-center justify-between gap-3 text-sm">
          {t(`web.notifications.${label}`)}
          <Switch checked={data[key]} onCheckedChange={(checked) => save({ [key]: checked })} />
        </label>
      ))}
      <p className="text-[13px] text-subtle">{t("web.notifications.moderationAlways")}</p>
      {showDigest ? (
        <fieldset className="flex flex-col gap-3 border-t border-line pt-4">
          <legend className="mb-3 pt-4 text-sm font-semibold">
            {t("web.notifications.digestTitle")}
          </legend>
          <p className="text-sm text-muted">
            {data.digestHours.length === 0
              ? t("web.notifications.digestImmediate")
              : t("web.notifications.digestBatch")}
          </p>
          <div className="flex flex-wrap gap-2">
            {DIGEST_HOURS.map((hour) => {
              const isOn = data.digestHours.includes(hour)

              return (
                <button
                  key={hour}
                  type="button"
                  aria-pressed={isOn}
                  onClick={() => toggleHour(hour)}
                  className={cn(
                    "h-9 rounded-full border px-3.5 text-sm font-medium tabular-nums",
                    isOn
                      ? "border-transparent bg-brand-soft font-semibold text-brand"
                      : "border-line bg-surface-sunken text-ink",
                  )}
                >
                  {formatDigestHour(hour)}
                </button>
              )
            })}
          </div>
          <p className="text-[13px] text-subtle">
            {t("web.notifications.digestHint", {
              timezone: viewer?.timezone ?? "America/Sao_Paulo",
            })}
          </p>
        </fieldset>
      ) : null}
    </div>
  )
}
