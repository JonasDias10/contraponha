"use client"

import { POST_TOPICS_MAX } from "@contraponha/config"
import { useQuery } from "@tanstack/react-query"
import { Plus, X } from "lucide-react"
import { useState } from "react"

import { useApi } from "@/components/providers/app-providers"
import { useI18n } from "@/components/providers/i18n-provider"
import { tagVariants } from "@/components/ui/badges"
import { cn } from "@/lib/cn"
import { queryKeys } from "@/lib/query-keys"

export interface TopicsFieldProps {
  value: string[]
  onChange: (topics: string[]) => void
}

// Curated interests are one tap away; anything else becomes a #hashtag topic.
export function TopicsField({ value, onChange }: TopicsFieldProps): React.JSX.Element {
  const { t } = useI18n()
  const api = useApi()
  const [draft, setDraft] = useState("")

  const curated = useQuery({
    queryKey: queryKeys.topics.curated,
    queryFn: () => api.topics.listCurated(),
  })

  const isFull = value.length >= POST_TOPICS_MAX
  const lowered = new Set(value.map((topic) => topic.toLowerCase()))

  const add = (name: string): void => {
    const cleaned = name.replace(/^#+/, "").trim()

    if (!cleaned || isFull || lowered.has(cleaned.toLowerCase())) return

    onChange([...value, cleaned])

    setDraft("")
  }

  const suggestions = (curated.data?.topics ?? [])
    .filter(({ name }) => !lowered.has(name.toLowerCase()))
    .slice(0, 8)

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-3 text-sm font-semibold">{t("web.composer.topics")}</legend>
      <div className="flex flex-wrap gap-2">
        {value.map((topic) => (
          <span key={topic} className={tagVariants()}>
            {topic}
            <button
              type="button"
              aria-label={t("web.composer.removeTopic", { topic })}
              onClick={() => onChange(value.filter((item) => item !== topic))}
              className="grid size-5 place-items-center rounded-full text-muted hover:text-ink"
            >
              <X aria-hidden className="size-3.5" />
            </button>
          </span>
        ))}
        {isFull ? null : (
          <label className={cn(tagVariants({ variant: "topic", size: "md" }), "w-full sm:w-auto")}>
            <Plus aria-hidden className="size-3.5" />
            <span className="sr-only">{t("web.composer.addTopic")}</span>
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === ",") {
                  event.preventDefault()

                  add(draft)
                }
              }}
              onBlur={() => add(draft)}
              placeholder={t("web.composer.topicPlaceholder")}
              className="min-w-0 flex-1 bg-transparent text-ink placeholder:text-subtle focus-visible:outline-none sm:w-44 sm:flex-none"
            />
          </label>
        )}
      </div>
      {isFull ? null : (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((topic) => (
            <button
              key={topic.slug}
              type="button"
              onClick={() => add(topic.name)}
              className={tagVariants({ variant: "topic", size: "sm" })}
            >
              <Plus aria-hidden className="size-3" />
              {topic.name}
            </button>
          ))}
        </div>
      )}
    </fieldset>
  )
}
