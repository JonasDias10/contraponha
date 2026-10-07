import type { Translate } from "@ponto/i18n"
import type { Recognition } from "@ponto/types"

import { topicLabel } from "@/components/post/topic-tags"

export interface RecognitionTextParams {
  recognition: Recognition
  t: Translate
}

export function recognitionText({ recognition, t }: RecognitionTextParams): string {
  const kind =
    recognition.kind === "good_argument"
      ? t("web.profile.kindGoodArgument")
      : t("web.profile.kindInsightful")

  if (recognition.topics.length === 0) return t("web.profile.recognizedForNoTopics", { kind })

  return t("web.profile.recognizedFor", {
    kind,
    topics: recognition.topics.map(topicLabel).join(", "),
  })
}
