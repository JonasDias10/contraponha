import type { TopicSummary } from "@contraponha/types"
import { topicLabel } from "@contraponha/client-core"
import Link from "next/link"

import { tagVariants } from "@contraponha/web-ui"
import { paths } from "@/lib/paths"

export interface TopicTagsProps {
  topics: TopicSummary[]
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
