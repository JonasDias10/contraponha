export interface TopicSummary {
  slug: string
  name: string
  isCurated: boolean
}

export interface TopicView extends TopicSummary {
  postCount: number
  followerCount: number
  viewer: TopicViewerState | null
}

export interface TopicViewerState {
  isFollowing: boolean
}

export interface TopicList {
  topics: TopicView[]
}
