export const ReactionKind = {
  GOOD_ARGUMENT: "good_argument",
  INSIGHTFUL: "insightful",
  AGREE: "agree",
  DISAGREE: "disagree",
} as const

export type ReactionKind = (typeof ReactionKind)[keyof typeof ReactionKind]

export type ReactionCounts = Record<ReactionKind, number>

export const ReactionTargetType = {
  POST: "post",
  COMMENT: "comment",
} as const

export type ReactionTargetType = (typeof ReactionTargetType)[keyof typeof ReactionTargetType]

export interface ViewerReactions {
  targetId: string
  kinds: ReactionKind[]
}

export interface ViewerReactionsResponse {
  reactions: ViewerReactions[]
}
