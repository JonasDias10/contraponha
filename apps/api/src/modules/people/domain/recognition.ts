import { RecognitionKind, type Recognition, type TopicSummary } from "@ponto/types"

// Below this many quality reactions, nothing is shown: a handful of reactions says little.
export const RECOGNITION_MIN_REACTIONS = 10

export const RECOGNITION_TOPICS_MAX = 2

export const SUGGESTIONS_LIMIT = 5

export const FOLLOWED_BY_PREVIEW_LIMIT = 3

export const WRITES_ABOUT_LIMIT = 4

export interface ReceivedReactions {
  goodArgument: number
  insightful: number
}

export interface ToRecognitionParams {
  received: ReceivedReactions
  topics: TopicSummary[]
}

export function toRecognition({ received, topics }: ToRecognitionParams): Recognition | null {
  if (received.goodArgument + received.insightful < RECOGNITION_MIN_REACTIONS) return null

  return {
    kind:
      received.goodArgument >= received.insightful
        ? RecognitionKind.GOOD_ARGUMENT
        : RecognitionKind.INSIGHTFUL,
    topics: topics.slice(0, RECOGNITION_TOPICS_MAX),
  }
}
