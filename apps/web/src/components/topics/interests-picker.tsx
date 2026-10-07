"use client"

import type { TopicView } from "@contraponha/types"
import { Check } from "lucide-react"

import { useI18n } from "@/components/providers/i18n-provider"
import { tagVariants } from "@/components/ui/badges"
import { cn } from "@/lib/cn"

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
