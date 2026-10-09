"use client"

import type { TopicView } from "@contraponha/types"
import { Check } from "lucide-react"

import { cn, tagVariants, useI18n } from "@contraponha/web-ui"

export interface InterestsPickerProps {
  topics: TopicView[]
  selected: Set<string>
  onToggle: (slug: string) => void
}

export function InterestsPicker({
  topics,
  selected,
  onToggle,
}: InterestsPickerProps): React.JSX.Element {
  const { t } = useI18n()

  return (
    <div role="group" aria-label={t("web.settings.interests")} className="flex flex-wrap gap-3">
      {topics.map((topic) => {
        const isOn = selected.has(topic.slug)

        return (
          <button
            key={topic.slug}
            type="button"
            aria-pressed={isOn}
            onClick={() => onToggle(topic.slug)}
            className={cn(tagVariants({ variant: isOn ? "selected" : "default", size: "lg" }))}
          >
            {isOn ? <Check aria-hidden className="size-4" /> : null}
            {topic.name}
          </button>
        )
      })}
    </div>
  )
}
