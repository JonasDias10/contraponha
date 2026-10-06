// Quality signals only: there is no agreement reaction, and popularity (followers, views)
// plays no part, so a well-argued post most people disagree with can still be recommended.
export const FEATURED_WEIGHTS = {
  goodArgument: 3,
  changedMyMind: 3,
  insightful: 2,
  comment: 1,
} as const

// Hacker News style decay: score / (ageInHours + AGE_OFFSET) ^ GRAVITY.
export const FEATURED_GRAVITY = 1.5
export const FEATURED_AGE_OFFSET_HOURS = 2

// Posts in a topic the reader follows rank as if their score were this many times higher.
export const FOLLOWED_TOPIC_BOOST = 2

export const FEATURED_MAX_OFFSET = 500

export const ONGOING_DISCUSSIONS_LIMIT = 3
