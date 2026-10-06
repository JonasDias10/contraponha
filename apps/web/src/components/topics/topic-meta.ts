import type { Locale, Translate } from "@ponto/i18n"
import type { TopicView } from "@ponto/types"

import { formatCount } from "@/lib/format"

export interface TopicMetaParams {
  topic: TopicView
  t: Translate
  locale: Locale
}

// "1,2 mil posts · 1 seguidor", each count with its own plural form.
export function topicMeta({ topic, t, locale }: TopicMetaParams): string {
  const posts = `${formatCount({ value: topic.postCount, locale })} ${t("web.profile.statPosts", { count: topic.postCount })}`

  const followers = `${formatCount({ value: topic.followerCount, locale })} ${t("web.profile.statFollowers", { count: topic.followerCount })}`

  return t("web.topic.meta", { posts, followers })
}
