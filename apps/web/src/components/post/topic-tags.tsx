import type { TopicSummary } from "@contraponha/types"
import Link from "next/link"

import { tagVariants } from "@/components/ui/badges"
import { paths } from "@/lib/paths"

export interface TopicTagsProps {
  topics: TopicSummary[]
}

export function topicLabel(topic: TopicSummary): string {
  return topic.isCurated ? topic.name : `#${topic.slug}`
}

export function TopicTags({ topics }: TopicTagsProps): React.JSX.Element | null {
  if (topics.length === 0) return null

  return (
    <ul className="flex flex-wrap gap-2">
      {topics.map((topic) => (
        <li key={topic.slug}>
          <Link
            href={paths.topic(topic.slug)}
            className={tagVariants({ variant: "topic", size: "sm" })}
          >
            {topicLabel(topic)}
          </Link>
        </li>
      ))}
    </ul>
  )
}
