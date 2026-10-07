"use client"

import { Check, Info } from "lucide-react"
import { Controller } from "react-hook-form"

import type { ComposerControl } from "@/components/composer/composer-schema"
import { useI18n } from "@/components/providers/i18n-provider"
import { RadioGroup, RadioItem } from "@/components/ui/controls"
import { Card, Panel } from "@/components/ui/surfaces"
import { cn } from "@/lib/cn"
import { readingMinutes, wordCount } from "@/lib/format"

const IDEAL_WORDS_MAX = 1200

export interface PublishChecklistProps {
  control: ComposerControl
  title: string
  body: string
  sourceCount: number
}

interface CheckItemProps {
  isDone: boolean
  children: React.ReactNode
}

function CheckItem({ isDone, children }: CheckItemProps): React.JSX.Element {
  return (
    <li className="flex items-start gap-3">
      <span
        aria-hidden
        className={cn(
          "grid size-6 flex-none place-items-center rounded-full",
          isDone ? "bg-success-soft text-success" : "bg-warning-soft text-warning",
        )}
      >
        {isDone ? <Check className="size-4" /> : <Info className="size-4" />}
      </span>
      <p className="text-sm">{children}</p>
    </li>
  )
}

// Nudges, never blocks: posts publish without a title or source, but the panel explains why
// they help the discussion.
export function PublishChecklist({
  control,
  title,
  body,
  sourceCount,
}: PublishChecklistProps): React.JSX.Element {
  const { t } = useI18n()
  const words = wordCount(body)

  return (
    <aside className="flex min-w-0 flex-col gap-4">
      <Card className="flex flex-col gap-4 p-5">
        <h2 className="font-semibold">{t("web.composer.beforePublishing")}</h2>
        <ul className="flex flex-col gap-3">
          <CheckItem isDone={sourceCount > 0}>
            {sourceCount > 0
              ? t("web.composer.checkSource", { count: sourceCount })
              : t("web.composer.checkNoSource")}
          </CheckItem>
          <CheckItem isDone={title.trim().length > 0}>
            {title.trim() ? t("web.composer.checkTitle") : t("web.composer.checkNoTitle")}
          </CheckItem>
        </ul>
        <hr className="h-px border-0 bg-line" />
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 text-sm font-semibold">
            {t("web.composer.whoCanContribute")}
          </legend>
          <Controller
            control={control}
            name="replyPolicy"
            render={({ field }) => (
              <RadioGroup
                value={field.value}
                onValueChange={field.onChange}
                className="flex flex-col gap-3"
              >
                <label className="flex items-start gap-3 text-sm">
                  <RadioItem value="everyone" />
                  {t("web.composer.everyone")}
                </label>
                <label className="flex items-start gap-3 text-sm">
                  <RadioItem value="following" />
                  {t("web.composer.followingOnly")}
                </label>
              </RadioGroup>
            )}
          />
        </fieldset>
        <p className="text-[13px] text-subtle">{t("web.composer.editLater")}</p>
      </Card>
      <Panel className="flex flex-col gap-2 p-4">
        <p className="text-[13px] text-subtle">
          {t("web.composer.stats", { minutes: readingMinutes(body), words })}
        </p>
        <div aria-hidden className="h-1 overflow-hidden rounded-full bg-line">
          <span
            className="block h-full rounded-full bg-brand"
            style={{ width: `${Math.min(100, (words / IDEAL_WORDS_MAX) * 100)}%` }}
          />
        </div>
        <p className="text-[13px] text-subtle">{t("web.composer.lengthTip")}</p>
      </Panel>
    </aside>
  )
}
