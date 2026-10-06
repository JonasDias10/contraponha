import type { TopicRow } from "@ponto/database"
import type { TopicSummary, TopicView } from "@ponto/types"

export type Topic = TopicRow

const DIACRITICS = /\p{Diacritic}/gu
const NON_ALPHANUMERIC_RUNS = /[^a-z0-9]+/g
const EDGE_DASHES = /^-+|-+$/g

// "Clima e Amazônia" -> "clima-e-amazonia", "#TarifaZero" -> "tarifazero".
export function slugifyTopic(name: string): string {
  return name
    .normalize("NFD")
    .replace(DIACRITICS, "")
    .toLowerCase()
    .replace(NON_ALPHANUMERIC_RUNS, "-")
    .replace(EDGE_DASHES, "")
}

export function toTopicSummary(topic: Topic): TopicSummary {
  return { slug: topic.slug, name: topic.name, isCurated: topic.isCurated }
}

export interface ToTopicViewParams {
  topic: Topic
  isFollowing: boolean | null
}

export function toTopicView({ topic, isFollowing }: ToTopicViewParams): TopicView {
  return {
    ...toTopicSummary(topic),
    postCount: topic.postCount,
    followerCount: topic.followerCount,
    viewer: isFollowing === null ? null : { isFollowing },
  }
}
