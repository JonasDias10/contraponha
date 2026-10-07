"use client"

import type { NotificationPreferences } from "@contraponha/types"
import type { UpdateNotificationPreferencesInput } from "@contraponha/validation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { errorMessage, queryKeys } from "@contraponha/client-core"

import { useApi } from "@/components/providers/app-providers"
import { useI18n } from "@/components/providers/i18n-provider"
import { useViewer } from "@/components/providers/viewer-provider"
import { Switch } from "@/components/ui/controls"
import { cn } from "@/lib/cn"

type PreferenceSwitch = Exclude<keyof NotificationPreferences, "digestHours">

interface SwitchOption {
  key: PreferenceSwitch
  label:
    | "prefReplies"
    | "prefMentions"
    | "prefHighlights"
    | "prefSourceRequests"
    | "prefReactions"
    | "prefFollows"
}

const SWITCHES: SwitchOption[] = [
  { key: "replies", label: "prefReplies" },
  { key: "mentions", label: "prefMentions" },
  { key: "highlights", label: "prefHighlights" },
  { key: "sourceRequests", label: "prefSourceRequests" },
  { key: "reactions", label: "prefReactions" },
  { key: "follows", label: "prefFollows" },
]

const DIGEST_HOURS = [7, 9, 12, 15, 19, 21] as const
const DIGEST_HOURS_MAX = 4

export interface NotificationPreferencesFormProps {
  showDigest?: boolean
}

export function NotificationPreferencesForm({
  showDigest = true,
}: NotificationPreferencesFormProps): React.JSX.Element | null {
  const { t } = useI18n()
  const api = useApi()
  const viewer = useViewer()
  const queryClient = useQueryClient()

  const { data } = useQuery({
    queryKey: queryKeys.notificationPreferences,
    queryFn: () => api.notifications.getPreferences(),
  })

  const save = useMutation({
    mutationFn: (input: UpdateNotificationPreferencesInput) =>
      api.notifications.updatePreferences(input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notificationPreferences })

      const previous = queryClient.getQueryData<NotificationPreferences>(
        queryKeys.notificationPreferences,
      )

      if (previous)
        queryClient.setQueryData(queryKeys.notificationPreferences, { ...previous, ...input })

      return { previous }
    },
    onError: (error, _input, context) => {
      if (context?.previous)
        queryClient.setQueryData(queryKeys.notificationPreferences, context.previous)

      toast.error(errorMessage({ error, t }))
    },
    onSuccess: (saved) => queryClient.setQueryData(queryKeys.notificationPreferences, saved),
  })

  if (!data) return null

  const toggleHour = (hour: number): void => {
    const hours = data.digestHours.includes(hour)
      ? data.digestHours.filter((value) => value !== hour)
      : [...data.digestHours, hour].toSorted((a, b) => a - b).slice(0, DIGEST_HOURS_MAX)

    save.mutate({ digestHours: hours })
  }

  return (
    <div className="flex flex-col gap-4">
      {SWITCHES.map(({ key, label }) => (
        <label key={key} className="flex items-center justify-between gap-3 text-sm">
          {t(`web.notifications.${label}`)}
          <Switch
            checked={data[key]}
            onCheckedChange={(checked) => save.mutate({ [key]: checked })}
          />
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
                  {`${String(hour).padStart(2, "0")}h`}
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
