import type { TopicSummary } from "@contraponha/types"

export function topicLabel(topic: TopicSummary): string {
  return topic.isCurated ? topic.name : `#${topic.slug}`
}
